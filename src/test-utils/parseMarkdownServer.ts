import { createHeadlessEditor } from "@lexical/headless";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";

import {
  ServerImageNode,
  ServerYouTubeNode,
  ServerTweetNode,
  ServerHorizontalRuleNode,
} from "../server/serverNodes";
import { SERVER_TRANSFORMERS } from "../server/serverTransformers";
import { preprocessMarkdown } from "../core/preprocessMarkdown";

export interface LexicalNode {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number;
  direction?: "ltr" | "rtl" | null;
  indent?: number;
  tag?: string;
  url?: string;
  target?: string;
  rel?: string;
  src?: string;
  altText?: string;
  height?: number;
  width?: number | "inherit";
  maxWidth?: number;
  videoID?: string;
  tweetID?: string;
  language?: string;
  rows?: LexicalNode[];
  checked?: boolean;
  headerState?: number;
  colSpan?: number;
  rowSpan?: number;
}

const ServerEditorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  ServerHorizontalRuleNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  ServerImageNode,
  ServerYouTubeNode,
  ServerTweetNode,
];

/**
 * 서버측에서 마크다운을 Lexical JSON 노드 배열로 변환
 */
export function parseMarkdownToLexicalNodes(markdown: string): LexicalNode[] {
  const processedMarkdown = preprocessMarkdown(markdown);

  const editor = createHeadlessEditor({
    nodes: ServerEditorNodes,
    onError: (error) => {
      console.error("[parseMarkdownServer] Lexical error:", error);
    },
  });

  editor.update(
    () => {
      $convertFromMarkdownString(processedMarkdown, SERVER_TRANSFORMERS);
    },
    { discrete: true }
  );

  const editorState = editor.getEditorState();
  const json = editorState.toJSON();

  return (json.root?.children as LexicalNode[]) || [];
}
