import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { $convertFromMarkdownString, Transformer } from "@lexical/markdown";
import { $getRoot } from "lexical";
import { preprocessMarkdown } from "../../core/preprocessMarkdown";

export default function MarkdownInitializerPlugin({
  markdown,
  transformers,
}: {
  markdown: string;
  transformers: Array<Transformer>;
}) {
  const [editor] = useLexicalComposerContext();
  const initializedRef = useRef(false);
  const initialMarkdownRef = useRef<string | null>(null);

  useEffect(() => {
    const normalizedMarkdown = preprocessMarkdown(markdown);

    // Only initialize once with non-empty markdown, or once with empty if that's the initial state
    if (initializedRef.current) {
      // If already initialized with empty, allow one more initialization when real data comes
      if (
        initialMarkdownRef.current === "" &&
        normalizedMarkdown &&
        normalizedMarkdown !== ""
      ) {
        // Real data arrived after initial empty state
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          $convertFromMarkdownString(normalizedMarkdown, transformers);
        });
        initialMarkdownRef.current = normalizedMarkdown;
      }
      return;
    }

    // First initialization
    editor.update(() => {
      if (normalizedMarkdown) {
        $convertFromMarkdownString(normalizedMarkdown, transformers);
      }
    });

    initializedRef.current = true;
    initialMarkdownRef.current = normalizedMarkdown;
  }, [editor, markdown, transformers]);

  return null;
}
