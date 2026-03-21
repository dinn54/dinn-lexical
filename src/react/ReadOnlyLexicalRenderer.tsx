"use client";

import type React from "react";
import { Editor } from "./Editor";

export function ReadOnlyLexicalRenderer({
  content,
  className,
  style,
}: {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return <Editor readOnly={true} content={content} className={className} style={style} />;
}
