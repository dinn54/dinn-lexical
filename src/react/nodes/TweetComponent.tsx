"use client";

import { Tweet } from "react-tweet";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  $isNodeSelection,
  $getSelection,
  ElementFormatType,
  NodeKey,
} from "lexical";
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { $isTweetNode } from "./TweetNode";
import { clampToContainerWidth, getResizeBoundaryWidth } from "./resizeBounds";
import theme from "../../core/theme";
import { AlignableBlock, MediaFrame, ResizableBlock } from "../ui/media-blocks";

export default function TweetComponent({
  tweetID,
  format,
  nodeKey,
  width,
}: {
  tweetID: string;
  format: ElementFormatType | null;
  nodeKey: NodeKey;
  width: number | "inherit";
}) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState(false);
  const [boundaryWidth, setBoundaryWidth] = useState(550);
  const containerRef = useRef<HTMLDivElement>(null);

  const isEditable = editor.isEditable();

  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (!isEditable) return false;
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isTweetNode(node)) {
          node.remove();
        }
      }
      return false;
    },
    [isSelected, nodeKey, isEditable]
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (!editor.isEditable()) return false;
          if (
            containerRef.current &&
            containerRef.current.contains(event.target as Node)
          ) {
            if (event.shiftKey) {
              setSelected(!isSelected);
            } else {
              clearSelection();
              setSelected(true);
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW
      )
    );
  }, [clearSelection, editor, isSelected, onDelete, setSelected]);

  const onResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsResizing(true);

    const startX = event.clientX;
    const startWidth = containerRef.current?.clientWidth || 0;
    const boundaryWidth = getResizeBoundaryWidth(containerRef.current, 550);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Only allow width resizing
      // Adjust delta based on alignment if needed?
      // Standard resize logic assumes LTR
      let newWidth = startWidth + deltaX;

      // Constrain width
      const maxWidth = Math.min(550, boundaryWidth);
      newWidth = clampToContainerWidth(newWidth, maxWidth, 250);

      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isTweetNode(node)) {
          node.setWidth(newWidth);
        }
      });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  // Default width if inherit: 450px as requested
  const displayWidth = width === "inherit" ? 450 : width;
  useLayoutEffect(() => {
    const nextBoundaryWidth = getResizeBoundaryWidth(containerRef.current, 550);
    if (nextBoundaryWidth !== boundaryWidth) {
      setBoundaryWidth(nextBoundaryWidth);
    }
    const maxWidth = Math.min(550, nextBoundaryWidth);
    const clampedWidth = clampToContainerWidth(displayWidth, maxWidth, 250);
    if (clampedWidth === displayWidth) return;
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isTweetNode(node)) {
        node.setWidth(clampedWidth);
      }
    });
  }, [boundaryWidth, displayWidth, editor, nodeKey]);

  const boundedDisplayWidth = clampToContainerWidth(
    displayWidth,
    Math.min(550, boundaryWidth),
    250
  );

  return (
    <AlignableBlock format={format}>
      <ResizableBlock
        ref={containerRef}
        className={`${theme.embedBlock.base} ${theme.media.tweet} group`}
        isSelected={isSelected && isEditable}
        style={{
          width: boundedDisplayWidth,
          maxWidth: "100%",
        }}
      >
        <MediaFrame>
          {/* @ts-ignore */}
          <Tweet id={tweetID} />
        </MediaFrame>

        {isSelected && isEditable && (
          <div
            className={`${theme.resizable.handle} ${theme.resizable.handleRight}`}
            onMouseDown={onResizeStart}
          >
            <div className={theme.resizable.handleBar} />
          </div>
        )}
      </ResizableBlock>
    </AlignableBlock>
  );
}
