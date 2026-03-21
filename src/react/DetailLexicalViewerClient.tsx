"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { cn } from "../core/cx";
import {
  readOnlyRenderContentClassName,
  readOnlyRenderFrameClassName,
  readOnlyRenderRootClassName,
  readOnlyRenderScrollAreaClassName,
} from "../core/readOnlyRenderShell";
import theme from "../core/theme";
import { ReadOnlyLexicalRenderer } from "./ReadOnlyLexicalRenderer";

interface DetailLexicalViewerClientProps {
  content: string;
  fallbackHtml: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DetailLexicalViewerClient({
  content,
  fallbackHtml,
  className,
  style,
}: DetailLexicalViewerClientProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className={cn(readOnlyRenderRootClassName, className)} style={style}>
        <div className={readOnlyRenderFrameClassName}>
          <div data-editor-scroll-area className={readOnlyRenderScrollAreaClassName}>
            <div
              className={cn(readOnlyRenderContentClassName, theme.root)}
              dangerouslySetInnerHTML={{ __html: fallbackHtml }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReadOnlyLexicalRenderer
      content={content}
      className={className}
      style={style}
    />
  );
}
