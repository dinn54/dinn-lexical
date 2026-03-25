"use client";

import type React from "react";
import { Tweet } from "react-tweet";
import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef } from "react";

import { cn } from "../core/cx";
import theme from "../core/theme";
import {
  readOnlyRenderContentClassName,
  readOnlyRenderFrameClassName,
  readOnlyRenderRootClassName,
  readOnlyRenderScrollAreaClassName,
} from "../core/readOnlyRenderShell";

interface DetailLexicalViewerClientProps {
  fallbackHtml: string;
  className?: string;
  style?: React.CSSProperties;
}

function EnhancedTweet({ tweetId }: { tweetId: string }) {
  return <Tweet id={tweetId} />;
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

    const roots = new Map<HTMLElement, Root>();
    const tweetElements = Array.from(
      container.querySelectorAll<HTMLElement>("[data-lexical-tweet-id]")
    );

    tweetElements.forEach((tweetElement) => {
      const tweetId = tweetElement.dataset.lexicalTweetId;
      if (!tweetId) {
        return;
      }

      const width = tweetElement.style.width;
      tweetElement.className = "";
      tweetElement.replaceChildren();
      tweetElement.style.width = width;
      tweetElement.style.maxWidth = "100%";

      const root = createRoot(tweetElement);
      roots.set(tweetElement, root);
      root.render(<EnhancedTweet tweetId={tweetId} />);
    });

    return () => {
      roots.forEach((root) => {
        root.unmount();
      });
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
