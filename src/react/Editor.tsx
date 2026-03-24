"use client";

import { $convertToMarkdownString } from "@lexical/markdown";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalIsTextContentEmpty } from "@lexical/react/useLexicalIsTextContentEmpty";
import { $createParagraphNode, $getRoot, LexicalEditor } from "lexical";
import React, { memo, useEffect, useMemo } from "react";

import { isLexicalEditorStateString } from "../core/contentFormat";
import { cn } from "../core/cx";
import {
  readOnlyRenderContentClassName,
  readOnlyRenderFrameClassName,
  readOnlyRenderRootClassName,
  readOnlyRenderScrollAreaClassName,
} from "../core/readOnlyRenderShell";
import theme from "../core/theme";
import { EditorNodes } from "../core/nodes";
import { CUSTOM_TRANSFORMERS } from "../core/transformers";
import CodeHighlightPlugin from "./plugins/code-highlight-plugin";
import MarkdownInitializerPlugin from "./plugins/MarkdownInitializerPlugin";
import NormalizeMediaParagraphPlugin from "./plugins/NormalizeMediaParagraphPlugin";
import NormalizeTableColumnWidthsPlugin from "./plugins/NormalizeTableColumnWidthsPlugin";

interface EditorProps {
  readOnly?: boolean;
  initialEditorState?: string | null;
  content?: string;
  markdown?: string;
  onInit?: (editor: LexicalEditor) => void;
  onChange?: (value: string) => void;
  outputFormat?: "markdown" | "json";
  className?: string;
  style?: React.CSSProperties;
  namespace?: string;
  toolbar?: React.ReactNode;
  editablePlugins?: React.ReactNode;
}

function EditorInitPlugin({ onInit }: { onInit: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onInit(editor);
  }, [editor, onInit]);

  return null;
}

function EditableSurface() {
  const [editor] = useLexicalComposerContext();
  const isEmpty = useLexicalIsTextContentEmpty(editor, true);

  const focusEditorToEnd = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!isEmpty && target.isContentEditable) return;

    event.preventDefault();
    editor.focus(() => {
      editor.update(() => {
        const root = $getRoot();
        const firstChild = root.getFirstChild();

        if (firstChild) {
          firstChild.selectStart();
          return;
        }

        const paragraph = $createParagraphNode();
        root.append(paragraph);
        paragraph.selectStart();
      });
    });
  };

  return (
    <div className="relative px-6" onMouseDown={focusEditorToEnd}>
      <div aria-hidden="true" className="h-9" />
      <div className="relative">
        {isEmpty && (
          <div
            className={cn(
              theme.placeholder,
              "pointer-events-none absolute top-0 left-0 z-0 select-none overflow-hidden text-ellipsis whitespace-nowrap text-[15px] leading-[1.75]"
            )}
          >
            Enter some rich text...
          </div>
        )}
        <ContentEditable className="relative z-10 min-h-full w-full text-left outline-none" />
      </div>
      <div aria-hidden="true" className="h-9" />
    </div>
  );
}

function EditorComponent({
  readOnly = false,
  initialEditorState,
  content,
  markdown,
  onInit,
  onChange,
  outputFormat = "markdown",
  className,
  style,
  namespace = "DinnLexicalEditor",
  toolbar,
  editablePlugins,
}: EditorProps) {
  const hasLexicalState = isLexicalEditorStateString(content);
  const resolvedInitialEditorState =
    initialEditorState ?? (hasLexicalState ? content : undefined);
  const legacyMarkdown = markdown ?? (!hasLexicalState ? content || "" : "");
  const initialConfig = useMemo(
    () => ({
      namespace,
      theme,
      nodes: EditorNodes,
      editorState: resolvedInitialEditorState,
      editable: !readOnly,
      onError(error: Error) {
        throw error;
      },
    }),
    [namespace, readOnly, resolvedInitialEditorState]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div
        className={cn(
          readOnly
            ? readOnlyRenderRootClassName
            : "relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm",
          className
        )}
        style={style}
      >
        {!readOnly && toolbar}
        <div className={cn(readOnly ? readOnlyRenderFrameClassName : "relative min-h-0 flex-1")}>
          <div
            data-editor-scroll-area
            className={cn(
              !readOnly && "absolute inset-0 overflow-y-auto",
              readOnly && readOnlyRenderScrollAreaClassName
            )}
          >
            <RichTextPlugin
              contentEditable={
                !readOnly ? (
                  <EditableSurface />
                ) : (
                  <ContentEditable
                    className={cn(
                      readOnlyRenderContentClassName,
                      "py-2"
                    )}
                  />
                )
              }
              placeholder={null}
              ErrorBoundary={({ children }) => <div>{children}</div>}
            />
          </div>
          <HistoryPlugin />
          {!readOnly && <AutoFocusPlugin />}
          <ListPlugin />
          <TablePlugin />
          <LinkPlugin />
          <ClickableLinkPlugin newTab />
          <CodeHighlightPlugin />
          <NormalizeMediaParagraphPlugin />
          {readOnly && <NormalizeTableColumnWidthsPlugin />}
          <MarkdownShortcutPlugin transformers={CUSTOM_TRANSFORMERS} />
          {!readOnly && editablePlugins}
          {onChange && (
            <OnChangePlugin
              onChange={(editorState) => {
                editorState.read(() => {
                  if (outputFormat === "json") {
                    onChange(JSON.stringify(editorState.toJSON()));
                    return;
                  }

                  onChange($convertToMarkdownString(CUSTOM_TRANSFORMERS));
                });
              }}
            />
          )}
          {!resolvedInitialEditorState && (
            <MarkdownInitializerPlugin
              markdown={legacyMarkdown || ""}
              transformers={CUSTOM_TRANSFORMERS}
            />
          )}
          {onInit && <EditorInitPlugin onInit={onInit} />}
        </div>
      </div>
    </LexicalComposer>
  );
}

export const Editor = memo(EditorComponent);
