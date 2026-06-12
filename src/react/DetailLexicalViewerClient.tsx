"use client";

import type React from "react";
import { EmbeddedTweet, useTweet } from "react-tweet";
import { createRoot, type Root } from "react-dom/client";
import { Component, useEffect, useRef, useState } from "react";

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
const ENTITY_KEYS = ["hashtags", "user_mentions", "urls", "symbols"] as const;

function normalizeTweetForEmbed(tweet: unknown): Record<string, unknown> | null {
  if (!tweet || typeof tweet !== "object") {
    return null;
  }

  const normalized = { ...(tweet as Record<string, unknown>) };
  const sourceEntities =
    normalized.entities && typeof normalized.entities === "object"
      ? (normalized.entities as Record<string, unknown>)
      : {};

  const entities: Record<string, unknown> = { ...sourceEntities };
  ENTITY_KEYS.forEach((key) => {
    entities[key] = Array.isArray(entities[key]) ? entities[key] : [];
  });

  if (entities.media !== undefined && !Array.isArray(entities.media)) {
    delete entities.media;
  }

  normalized.entities = entities;

  if (normalized.quoted_tweet) {
    normalized.quoted_tweet = normalizeTweetForEmbed(normalized.quoted_tweet);
  }

  return normalized;
}

class TweetEnhancementErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Tweet enhancement failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function EnhancedTweet({
  tweetId,
  onReady,
}: {
  tweetId: string;
  onReady: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const { data, error, isLoading } = useTweet(tweetId);
  const normalizedTweet = normalizeTweetForEmbed(data);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const markReadyIfTweetRendered = () => {
      if (host.querySelector(".react-tweet-theme")) {
        setIsReady(true);
        onReady();
      }
    };

    markReadyIfTweetRendered();

    const observer = new MutationObserver(markReadyIfTweetRendered);
    observer.observe(host, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [normalizedTweet, onReady]);

  if (isLoading || error || !normalizedTweet) {
    return null;
  }

  return (
    <div
      ref={hostRef}
      aria-hidden={!isReady}
      style={{ display: isReady ? "block" : "none" }}
    >
      {/* @ts-ignore normalizedTweet preserves react-tweet's runtime tweet shape. */}
      <EmbeddedTweet tweet={normalizedTweet} />
    </div>
  );
}

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

    const roots = new Map<HTMLElement, Root>();
    const tweetElements = Array.from(
      container.querySelectorAll<HTMLElement>("[data-lexical-tweet-id]")
    );

    tweetElements.forEach((tweetElement) => {
      const tweetId = tweetElement.dataset.lexicalTweetId;
      if (!tweetId) {
        return;
      }

      const host = document.createElement("div");
      host.className = "editor-detail-tweet-enhancer";
      host.style.width = tweetElement.style.width || "100%";
      host.style.maxWidth = "100%";
      tweetElement.insertAdjacentElement("afterend", host);

      const root = createRoot(host);
      roots.set(host, root);
      root.render(
        <TweetEnhancementErrorBoundary>
          <EnhancedTweet
            tweetId={tweetId}
            onReady={() => {
              tweetElement.style.display = "none";
            }}
          />
        </TweetEnhancementErrorBoundary>
      );
    });

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
      roots.forEach((root, host) => {
        root.unmount();
        host.remove();
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
