import { createHeadlessEditor } from "@lexical/headless";
import { $generateHtmlFromNodes } from "@lexical/html";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { parseHTML } from "linkedom";
import theme from "../core/theme";
import { setupPrism } from "./setupPrism";

import {
  ServerImageNode,
  ServerYouTubeNode,
  ServerTweetNode,
  ServerHorizontalRuleNode,
} from "./serverNodes";
import { isLexicalEditorStateString } from "../core/contentFormat";
import { generateHtmlFromMarkdown } from "./generateHtmlFromMarkdown";
import { normalizeGeneratedLexicalHtml } from "./normalizeGeneratedLexicalHtml";

const ServerEditorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  ServerHorizontalRuleNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  ServerImageNode,
  ServerYouTubeNode,
  ServerTweetNode,
];

function setGlobalDom(key: "window" | "document", value: unknown): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  if (descriptor && !descriptor.writable && !descriptor.set) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      writable: true,
      value,
    });
    return;
  }

  (globalThis as Record<string, unknown>)[key] = value;
}

function generateHtmlFromLexicalState(editorStateString: string): string {
  setupPrism();

  const editor = createHeadlessEditor({
    theme,
    nodes: ServerEditorNodes,
    onError: (error) => {
      console.error("[generateHtmlFromContent] Lexical error:", error);
    },
  });
  const unregisterCodeHighlighting = registerCodeHighlighting(editor);

  const parsedState = editor.parseEditorState(editorStateString);
  editor.setEditorState(parsedState);

  let html = "";
  editor.update(
    () => {
      html = $generateHtmlFromNodes(editor);
    },
    { discrete: true }
  );
  unregisterCodeHighlighting();

  return normalizeGeneratedLexicalHtml(html);
}

export function generateHtmlFromContent(content: string): string {
  if (!content) return "";

  if (!isLexicalEditorStateString(content)) {
    return generateHtmlFromMarkdown(content);
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return generateHtmlFromLexicalState(content);
  }

  const { document: domDocument, window: domWindow } = parseHTML(
    "<!DOCTYPE html><html><body></body></html>"
  );

  const hasPrevWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const hasPrevDocument = Object.prototype.hasOwnProperty.call(globalThis, "document");
  const prevWindow = (globalThis as Record<string, unknown>).window;
  const prevDocument = (globalThis as Record<string, unknown>).document;

  setGlobalDom("window", domWindow as unknown as Window & typeof globalThis);
  setGlobalDom("document", domDocument as unknown as Document);

  try {
    return generateHtmlFromLexicalState(content);
  } catch (error) {
    console.error("[generateHtmlFromContent] Fallback to markdown parser:", error);
    return generateHtmlFromMarkdown(content);
  } finally {
    if (!hasPrevWindow) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      setGlobalDom("window", prevWindow);
    }

    if (!hasPrevDocument) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      setGlobalDom("document", prevDocument);
    }
  }
}
