"use client";

import type React from "react";
import { useEffect, useRef } from "react";

import { cn } from "../core/cx";
import theme from "../core/theme";
import {
  readOnlyRenderContentClassName,
  readOnlyRenderFrameClassName,
  readOnlyRenderRootClassName,
  readOnlyRenderScrollAreaClassName,
} from "../core/readOnlyRenderShell";
import { clampToContainerWidth, getResizeBoundaryWidth } from "./nodes/resizeBounds";

interface DetailLexicalViewerClientProps {
  fallbackHtml: string;
  className?: string;
  style?: React.CSSProperties;
}

const MIN_RESIZABLE_WIDTH = 100;

function normalizeReadOnlyMediaWidths(container: HTMLElement) {
  const resizableNodes = Array.from(
    container.querySelectorAll<HTMLElement>(`.${theme.resizable.node}`)
  );

  resizableNodes.forEach((node) => {
    const declaredWidth = Number.parseFloat(node.style.width || "");
    const mediaImage = node.querySelector<HTMLImageElement>(`.${theme.media.image}`);
    const imageWidthAttr = Number.parseFloat(mediaImage?.getAttribute("width") || "");
    const naturalWidth = mediaImage?.naturalWidth ?? 0;
    const fallbackWidth =
      naturalWidth > 0
        ? naturalWidth
        : Number.isFinite(imageWidthAttr) && imageWidthAttr > 0
          ? imageWidthAttr
          : MIN_RESIZABLE_WIDTH;

    const preferredWidth =
      Number.isFinite(declaredWidth) && declaredWidth > 0
        ? declaredWidth
        : fallbackWidth;
    const boundaryWidth = getResizeBoundaryWidth(node, preferredWidth);
    const clampedWidth = clampToContainerWidth(
      preferredWidth,
      boundaryWidth,
      MIN_RESIZABLE_WIDTH
    );

    node.style.width = `${clampedWidth}px`;
    node.style.maxWidth = "100%";
    if (mediaImage) {
      mediaImage.setAttribute("width", `${clampedWidth}`);
    }
  });
}

export function DetailLexicalViewerClient({
  fallbackHtml,
  className,
  style,
}: DetailLexicalViewerClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    normalizeReadOnlyMediaWidths(container);

    const imageElements = Array.from(
      container.querySelectorAll<HTMLImageElement>(`.${theme.media.image}`)
    );
    const imageCleanups = imageElements.map((imageElement) => {
      const handleLoad = () => {
        normalizeReadOnlyMediaWidths(container);
      };

      imageElement.addEventListener("load", handleLoad);
      return () => {
        imageElement.removeEventListener("load", handleLoad);
      };
    });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            normalizeReadOnlyMediaWidths(container);
          })
        : null;

    resizeObserver?.observe(container);

    return () => {
      imageCleanups.forEach((cleanup) => {
        cleanup();
      });
      resizeObserver?.disconnect();
    };
  }, [fallbackHtml]);

  return (
    <div className={cn(readOnlyRenderRootClassName, className)} style={style}>
      <div className={readOnlyRenderFrameClassName}>
        <div data-editor-scroll-area className={readOnlyRenderScrollAreaClassName}>
          <div
            ref={containerRef}
            className={cn(readOnlyRenderContentClassName, theme.root)}
            dangerouslySetInnerHTML={{ __html: fallbackHtml }}
          />
        </div>
      </div>
    </div>
  );
}
