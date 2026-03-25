"use client";

import { useEffect, useState } from "react";

import { ReadOnlyLexicalRenderer } from "./ReadOnlyLexicalRenderer";
import { buildDetailViewerStyle } from "./detailViewerStyle";

type Dimension = number | string;

interface ClientReadOnlyLexicalViewerProps {
  content: string;
  className?: string;
  width?: Dimension;
  maxWidth?: Dimension;
}

export function ClientReadOnlyLexicalViewer({
  content,
  className,
  width,
  maxWidth,
}: ClientReadOnlyLexicalViewerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const style = buildDetailViewerStyle(width, maxWidth);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <ReadOnlyLexicalRenderer
      content={content}
      className={className}
      style={style}
    />
  );
}
