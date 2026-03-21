"use client";

import { Editor } from "./Editor";

export function ReadOnlyLexicalRenderer({ content }: { content: string }) {
  return <Editor readOnly={true} content={content} />;
}
