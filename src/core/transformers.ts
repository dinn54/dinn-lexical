import {
  $convertFromMarkdownString,
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  Transformer,
} from "@lexical/markdown";
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { $createParagraphNode, $createTextNode } from "lexical";

import {
  $createTweetNode,
  $isTweetNode,
  TweetNode,
} from "../react/nodes/TweetNode";
import {
  $createImageNode,
  $isImageNode,
  ImageNode,
} from "../react/nodes/ImageNode";
import {
  $createYouTubeNode,
  $isYouTubeNode,
  YouTubeNode,
} from "../react/nodes/YouTubeNode";

const OPTIONAL_IMAGE_TITLE = String.raw`(?:\s+"[^"]*")?`;

export const IMAGE: Transformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null;
    }
    const width = node.__width;
    const widthStr = typeof width === "number" ? ` =${width}x` : "";
    return `![${node.getAltText()}](${node.getSrc()}${widthStr})`;
  },
  // Match: ![alt](src), ![alt](src "title"), or ![alt](src =500x "title")
  importRegExp: new RegExp(
    String.raw`!\[([^[]*)\]\(([^)\s]+)(?:\s*=(\d+)x)?${OPTIONAL_IMAGE_TITLE}\)`,
  ),
  regExp: new RegExp(
    String.raw`!\[([^[]*)\]\(([^)\s]+)(?:\s*=(\d+)x)?${OPTIONAL_IMAGE_TITLE}\)$`,
  ),
  replace: (textNode, match) => {
    const [, altText, src, widthStr] = match;
    const width = widthStr ? parseInt(widthStr, 10) : 500;
    const imageNode = $createImageNode({
      altText,
      src,
      width,
      maxWidth: 800,
    });
    textNode.replace(imageNode);
  },
  trigger: ")",
  type: "text-match",
};

export const YOUTUBE: Transformer = {
  dependencies: [YouTubeNode],
  export: (node) => {
    if (!$isYouTubeNode(node)) {
      return null;
    }
    const width = node.getWidth();
    return `[youtube](${node.getId()} =${width}x)`;
  },
  // Match: [youtube](videoID) or [youtube](videoID =560x)
  importRegExp: /\[youtube\]\(([^\s)]+)(?:\s*=(\d+)x)?\)/,
  regExp: /\[youtube\]\(([^\s)]+)(?:\s*=(\d+)x)?\)$/,
  replace: (textNode, match) => {
    const [, videoID, widthStr] = match;
    const width = widthStr ? parseInt(widthStr, 10) : 560;
    const youtubeNode = $createYouTubeNode(videoID);
    youtubeNode.setWidth(width);
    textNode.replace(youtubeNode);
  },
  trigger: ")",
  type: "text-match",
};

export const TWEET: Transformer = {
  dependencies: [TweetNode],
  export: (node) => {
    if (!$isTweetNode(node)) {
      return null;
    }
    return `[tweet](${node.getId()})`;
  },
  importRegExp: /\[tweet\]\(([^)]+)\)/,
  regExp: /\[tweet\]\(([^)]+)\)$/,
  replace: (textNode, match) => {
    const [, tweetID] = match;
    const tweetNode = $createTweetNode(tweetID);
    textNode.replace(tweetNode);
  },
  trigger: ")",
  type: "text-match",
};

import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "../react/nodes/HorizontalRuleNode";

const TABLE_ROW_REGEXP = /^\|(.+)\|\s?$/;
const TABLE_DIVIDER_REGEXP = /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s?$/;

function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!TABLE_ROW_REGEXP.test(trimmed)) return null;
  const inner = trimmed.replace(/^\|/, "").replace(/\|\s?$/, "");

  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "\\" && i + 1 < inner.length && inner[i + 1] === "|") {
      current += "|";
      i += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeRowCells(cells: string[], width: number): string[] {
  if (cells.length === width) return cells;
  if (cells.length > width) return cells.slice(0, width);
  return [...cells, ...Array(width - cells.length).fill("")];
}

function encodeTableCellMarkdown(markdown: string): string {
  return markdown
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br />");
}

function decodeTableCellMarkdown(encoded: string): string {
  return encoded
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\\\/g, "\\");
}

export const TABLE: Transformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node, exportChildren) => {
    if (!$isTableNode(node)) return null;

    const rowNodes = node
      .getChildren()
      .filter($isTableRowNode);
    if (rowNodes.length === 0) return null;

    const rows = rowNodes.map((rowNode) =>
      rowNode
        .getChildren()
        .filter($isTableCellNode)
        .map((cellNode) => {
          const cellMarkdown = exportChildren
            ? exportChildren(cellNode)
            : cellNode.getTextContent();
          return encodeTableCellMarkdown(cellMarkdown);
        })
    );

    if (rows.length === 0 || rows[0].length === 0) return null;

    const header = `| ${rows[0].join(" | ")} |`;
    const divider = `| ${rows[0].map(() => "---").join(" | ")} |`;
    const body = rows.slice(1).map((cells) => `| ${cells.join(" | ")} |`);

    return [header, divider, ...body].join("\n");
  },
  regExpStart: TABLE_ROW_REGEXP,
  regExpEnd: { optional: true, regExp: /^$/ },
  handleImportAfterStartMatch: ({ lines, startLineIndex, rootNode }) => {
    const tableLines: string[] = [];
    let cursor = startLineIndex;

    while (cursor < lines.length) {
      const line = lines[cursor];
      if (!TABLE_ROW_REGEXP.test(line.trim())) break;
      tableLines.push(line);
      cursor += 1;
    }

    // Must have header + divider at minimum.
    if (tableLines.length < 2) return null;
    if (!TABLE_DIVIDER_REGEXP.test(tableLines[1].trim())) return null;

    const headerCells = parseTableRow(tableLines[0]);
    if (!headerCells || headerCells.length === 0) return null;

    const width = headerCells.length;
    const bodyRows = tableLines.slice(2);
    const parsedRows = [
      normalizeRowCells(headerCells, width),
      ...bodyRows
        .map(parseTableRow)
        .filter((cells): cells is string[] => Boolean(cells))
        .map((cells) => normalizeRowCells(cells, width)),
    ];

    const tableNode = $createTableNode();
    parsedRows.forEach((cells, rowIndex) => {
      const rowNode = $createTableRowNode();
      cells.forEach((cellText) => {
        const cellNode = $createTableCellNode(
          rowIndex === 0
            ? TableCellHeaderStates.ROW
            : TableCellHeaderStates.NO_STATUS
        );
        const cellMarkdown = decodeTableCellMarkdown(cellText);
        if (cellMarkdown.trim()) {
          $convertFromMarkdownString(
            cellMarkdown,
            CUSTOM_TRANSFORMERS,
            cellNode,
            false,
            true
          );
        } else {
          const paragraphNode = $createParagraphNode();
          paragraphNode.append($createTextNode(""));
          cellNode.append(paragraphNode);
        }
        rowNode.append(cellNode);
      });
      tableNode.append(rowNode);
    });

    rootNode.append(tableNode);
    return [true, cursor - 1];
  },
  replace: () => {
    // Handled by handleImportAfterStartMatch.
  },
  type: "multiline-element",
};

export const HR: Transformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? "***" : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode) => {
    const line = $createHorizontalRuleNode();
    const paragraphNode = $createParagraphNode();
    paragraphNode.append($createTextNode(""));
    parentNode.replace(line);
    line.insertAfter(paragraphNode);
    paragraphNode.selectStart();
  },
  type: "element",
};

export const CUSTOM_TRANSFORMERS: Array<Transformer> = [
  TABLE,
  IMAGE,
  YOUTUBE,
  TWEET,
  HR,
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];
