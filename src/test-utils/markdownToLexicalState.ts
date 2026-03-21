import { parseMarkdownToLexicalNodes } from "./parseMarkdownServer";

type LexicalEditorState = {
  root: {
    children: unknown[];
    direction: null;
    format: "";
    indent: 0;
    type: "root";
    version: 1;
  };
};

export function markdownToLexicalStateString(markdown: string): string {
  const children = parseMarkdownToLexicalNodes(markdown || "");
  const editorState: LexicalEditorState = {
    root: {
      children,
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
  return JSON.stringify(editorState);
}

