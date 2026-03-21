import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { HorizontalRuleNode } from "../react/nodes/HorizontalRuleNode";
import { YouTubeNode } from "../react/nodes/YouTubeNode";
import { TweetNode } from "../react/nodes/TweetNode";
import { ImageNode } from "../react/nodes/ImageNode";

export const EditorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  HorizontalRuleNode,
  YouTubeNode,
  TweetNode,
  ImageNode,
  TableNode,
  TableCellNode,
  TableRowNode,
];
