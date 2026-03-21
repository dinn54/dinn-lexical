"use client";
import React, { memo, useState, useCallback, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_DELETE_COMMAND,
  KEY_BACKSPACE_COMMAND,
  NodeKey,
} from "lexical";
import { $isYouTubeNode } from "./YouTubeNode";
import { clampToContainerWidth, getResizeBoundaryWidth } from "./resizeBounds";
import theme from "../../core/theme";
import { AlignableBlock, MediaFrame, ResizableBlock } from "../ui/media-blocks";

const YouTubeFrame = memo(function YouTubeFrame({
  videoID,
  isEditable,
}: {
  videoID: string;
  isEditable: boolean;
}) {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoID}`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen={true}
      title="YouTube video player"
      className={theme.media.aspectVideo}
      style={{ pointerEvents: isEditable ? "none" : "auto" }}
    />
  );
});

function LexicalYouTubeComponent({
  className,
  format,
  nodeKey,
  videoID,
  width,
}: {
  className: Readonly<{
    base: string;
    focus: string;
  }>;
  format: string | null;
  nodeKey: NodeKey;
  videoID: string;
  width: number;
}): React.JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width || 560);
  const isEditable = editor.isEditable();

  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if (node) {
          node.remove();
        }
        return true;
      }
      return false;
    },
    [isSelected, nodeKey]
  );

  const handleResizeStart = useCallback(
    (event: React.MouseEvent, direction: "left" | "right") => {
      event.preventDefault();
      event.stopPropagation();
      setIsResizing(true);

      const startX = event.clientX;
      const startWidth = currentWidth;
      const boundaryWidth = getResizeBoundaryWidth(containerRef.current, 800);
      let finalWidth = startWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = direction === "right" ? e.clientX - startX : startX - e.clientX;
        finalWidth = clampToContainerWidth(startWidth + deltaX, boundaryWidth, 200);
        setCurrentWidth(finalWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // Update the node with the new width
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isYouTubeNode(node)) {
            node.setWidth(finalWidth);
          }
        });
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [currentWidth, editor, nodeKey]
  );

  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (
            containerRef.current?.contains(event.target as Node) &&
            !(event.target as HTMLElement).classList.contains("resize-handle")
          ) {
            clearSelection();
            setSelected(true);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW)
    );
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);

  // Sync width from props
  React.useEffect(() => {
    if (!isResizing) {
      const boundaryWidth = getResizeBoundaryWidth(containerRef.current, 800);
      const clampedWidth = clampToContainerWidth(width, boundaryWidth, 200);
      if (clampedWidth !== currentWidth) {
        setCurrentWidth(clampedWidth);
      }
    }
  }, [width, isResizing, currentWidth]);

  React.useLayoutEffect(() => {
    if (isResizing) return;
    const boundaryWidth = getResizeBoundaryWidth(containerRef.current, 800);
    const clampedWidth = clampToContainerWidth(currentWidth, boundaryWidth, 200);
    if (clampedWidth === currentWidth) return;
    setCurrentWidth(clampedWidth);
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isYouTubeNode(node)) {
        node.setWidth(clampedWidth);
      }
    });
  }, [currentWidth, editor, isResizing, nodeKey]);

  return (
    <AlignableBlock format={format as any}>
      <ResizableBlock
        ref={containerRef}
        className={`${theme.media.youtube} ${theme.embedBlock.base}`}
        isSelected={isSelected && isEditable}
        style={{
          width: `${currentWidth}px`,
          maxWidth: "100%",
          padding: "0",
          boxSizing: "border-box",
        }}
      >
        {isEditable && (
          <div
            className={theme.media.overlay}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clearSelection();
              setSelected(true);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setSelected(false);
            }}
          />
        )}
        <MediaFrame className={theme.media.frame}>
          <YouTubeFrame videoID={videoID} isEditable={isEditable} />
        </MediaFrame>
        {isSelected && isEditable && (
          <>
            <div
              className={`resize-handle ${theme.resizable.handle} ${theme.resizable.handleLeft}`}
              onMouseDown={(e) => handleResizeStart(e, "left")}
            >
              <div className={theme.resizable.handleBar} />
            </div>
            <div
              className={`resize-handle ${theme.resizable.handle} ${theme.resizable.handleRight}`}
              onMouseDown={(e) => handleResizeStart(e, "right")}
            >
              <div className={theme.resizable.handleBar} />
            </div>
          </>
        )}
      </ResizableBlock>
    </AlignableBlock>
  );
}

export default memo(LexicalYouTubeComponent);
