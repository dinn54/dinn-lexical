import type { LexicalNode } from "./parseMarkdownServer";
import markdownUserSample from "./fixtures/markdownUserSample";
import lexicalUserSample from "./fixtures/lexical-user-sample.json";
import tableEditorSample from "./fixtures/table-editor-sample.json";

export type LexicalComparisonFixture = {
  id: string;
  title: string;
  kind: "nodes" | "markdown";
  nodes?: LexicalNode[];
  markdown?: string;
  content?: string;
};

export const lexicalComparisonFixtures: Record<string, LexicalComparisonFixture> = {
  baseline: {
    id: "baseline",
    title: "Baseline SSR Fixture",
    kind: "nodes",
    nodes: [
      {
        type: "heading",
        tag: "h2",
        children: [{ type: "text", text: "SSR Comparison Heading" }],
      },
      {
        type: "paragraph",
        children: [
          { type: "text", text: "This paragraph includes " },
          { type: "text", text: "bold", format: 1 },
          { type: "text", text: ", " },
          { type: "text", text: "italic", format: 2 },
          { type: "text", text: ", and a " },
          {
            type: "link",
            url: "https://example.com/docs",
            children: [{ type: "text", text: "link" }],
          },
          { type: "text", text: "." },
        ],
      },
      {
        type: "quote",
        children: [
          {
            type: "text",
            text: "Server output should remain stable after hydration.",
          },
        ],
      },
      {
        type: "list",
        tag: "ul",
        children: [
          {
            type: "listitem",
            children: [{ type: "text", text: "unordered item one" }],
          },
          {
            type: "listitem",
            children: [{ type: "text", text: "unordered item two" }],
          },
        ],
      },
      {
        type: "code",
        language: "tsx",
        children: [
          {
            type: "text",
            text: "export function Demo() {\n  return <div>stable</div>;\n}",
          },
        ],
      },
      {
        type: "table",
        children: [
          {
            type: "tablerow",
            children: [
              {
                type: "tablecell",
                headerState: 1,
                children: [{ type: "paragraph", children: [{ type: "text", text: "Name" }] }],
              },
              {
                type: "tablecell",
                headerState: 1,
                children: [{ type: "paragraph", children: [{ type: "text", text: "Value" }] }],
              },
            ],
          },
          {
            type: "tablerow",
            children: [
              {
                type: "tablecell",
                children: [
                  { type: "paragraph", children: [{ type: "text", text: "Renderer" }] },
                ],
              },
              {
                type: "tablecell",
                children: [
                  { type: "paragraph", children: [{ type: "text", text: "Server" }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  "user-lexical": {
    id: "user-lexical",
    title: "User Lexical JSON Fixture",
    kind: "nodes",
    nodes: lexicalUserSample.root.children as LexicalNode[],
    content: JSON.stringify(lexicalUserSample),
  },
  "user-markdown": {
    id: "user-markdown",
    title: "User Markdown Fixture",
    kind: "markdown",
    markdown: markdownUserSample,
    content: markdownUserSample,
  },
  "table-editor": {
    id: "table-editor",
    title: "Table Editor Feature Fixture",
    kind: "nodes",
    nodes: tableEditorSample.root.children as unknown as LexicalNode[],
    content: JSON.stringify(tableEditorSample),
  },
};

export function getLexicalComparisonFixture(id?: string): LexicalComparisonFixture {
  if (id && lexicalComparisonFixtures[id]) {
    return lexicalComparisonFixtures[id];
  }

  return lexicalComparisonFixtures.baseline;
}
