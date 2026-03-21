"use client";
import React, { Suspense, useRef, useState, useCallback } from "react";
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
import { $isImageNode } from "./ImageNode";
import { clampToContainerWidth, getResizeBoundaryWidth } from "./resizeBounds";
import theme from "../../core/theme";
import {
  AlignableBlock,
  MediaFigure,
  MediaFrame,
} from "../ui/media-blocks";
import { getBlockAlignmentClass } from "./block-alignment";

const imageCache = new Set();

function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.add(src);
        resolve(null);
      };
    });
  }
}

function LazyImage({
  altText,
  className,
  imageRef,
  src,
  width,
}: {
  altText: string;
  className: string | null;
  imageRef: { current: null | HTMLImageElement };
  src: string;
  width: number;
}) {
  useSuspenseImage(src);
  return (
    <img
      className={className || undefined}
      src={src}
      alt={altText}
      ref={imageRef}
      style={{
        width: "100%",
        height: "auto",
        maxWidth: "100%",
      }}
      draggable="false"
    />
  );
}

export default function LexicalImageComponent({
  src,
  altText,
  nodeKey,
  format,
  width,
  height,
  maxWidth,
  showCaption,
  caption,
  captionsEnabled,
}: {
  src: string;
  altText: string;
  nodeKey: NodeKey;
  format: "center" | "end" | "justify" | "left" | "right" | "start" | null;
  width: "inherit" | number;
  height: "inherit" | number;
  maxWidth: number;
  showCaption: boolean;
  caption: any;
  captionsEnabled: boolean;
}): React.JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const imageRef = useRef<null | HTMLImageElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(
    typeof width === "number" ? width : 500
  );
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
        finalWidth = clampToContainerWidth(startWidth + deltaX, boundaryWidth, 100);
        setCurrentWidth(finalWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // Update the node with the new width
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setWidthAndHeight(finalWidth, "inherit");
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
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW)
    );
  }, [clearSelection, editor, isSelected, nodeKey, onDelete, setSelected]);

  // Sync width from props
  React.useEffect(() => {
    if (typeof width === "number" && !isResizing) {
      const boundaryWidth = getResizeBoundaryWidth(containerRef.current, 800);
      const clampedWidth = clampToContainerWidth(width, boundaryWidth, 100);
      if (clampedWidth !== currentWidth) {
        setCurrentWidth(clampedWidth);
      }
    }
  }, [width, isResizing, currentWidth]);

  React.useLayoutEffect(() => {
    if (isResizing) return;
    const boundaryWidth = getResizeBoundaryWidth(containerRef.current, 800);
    const clampedWidth = clampToContainerWidth(currentWidth, boundaryWidth, 100);
    if (clampedWidth === currentWidth) return;
    setCurrentWidth(clampedWidth);
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setWidthAndHeight(clampedWidth, "inherit");
      }
    });
  }, [currentWidth, editor, isResizing, nodeKey]);

  const figure = (
    <MediaFigure as={showCaption && caption ? "figure" : "span"}>
      <span
        ref={containerRef}
        className={`${theme.resizable.node} ${isSelected && isEditable ? theme.embedBlock.focus : ""}`}
        style={{ width: `${currentWidth}px`, maxWidth: "100%" }}
      >
        <span className={theme.resizable.frame}>
          <LazyImage
            className={theme.media.image}
            src={src}
            altText={altText}
            imageRef={imageRef}
            width={currentWidth}
          />
        </span>
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
      </span>
    </MediaFigure>
  );

  const needsBlockAlignment =
    format === "center" || format === "right" || format === "end" || format === "justify";

  return (
    <Suspense
      fallback={<div className={theme.media.loading} />}
    >
      {needsBlockAlignment ? (
        <AlignableBlock format={format}>{figure}</AlignableBlock>
      ) : (
        <div className={theme.decoratorContents}>{figure}</div>
      )}
    </Suspense>
  );
}
