"use client";

import { registerCodeHighlighting } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { setupPrism } from "../../server/setupPrism";

export default function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    setupPrism();
    return registerCodeHighlighting(editor);
  }, [editor]);
  return null;
}
