"use client";

import type React from "react";
import { Component, useEffect, useRef, useState } from "react";
import { EmbeddedTweet, useTweet } from "react-tweet";

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

interface SafeTweetEnhancementProps {
  tweetId: string;
  onReady?: () => void;
  style?: React.CSSProperties;
}

function SafeTweetEnhancementInner({
  tweetId,
  onReady,
  style,
}: SafeTweetEnhancementProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const { data, error, isLoading } = useTweet(tweetId);
  const normalizedTweet = normalizeTweetForEmbed(data);

  useEffect(() => {
    setIsReady(false);
  }, [tweetId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const markReadyIfTweetRendered = () => {
      if (host.querySelector(".react-tweet-theme")) {
        setIsReady(true);
        onReady?.();
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
      style={{
        ...style,
        display: isReady ? (style?.display ?? "block") : "none",
      }}
    >
      {/* @ts-ignore normalizedTweet preserves react-tweet's runtime tweet shape. */}
      <EmbeddedTweet tweet={normalizedTweet} />
    </div>
  );
}

export function SafeTweetEnhancement(props: SafeTweetEnhancementProps) {
  return (
    <TweetEnhancementErrorBoundary>
      <SafeTweetEnhancementInner {...props} />
    </TweetEnhancementErrorBoundary>
  );
}
