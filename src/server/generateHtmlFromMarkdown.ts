import { createHeadlessEditor } from "@lexical/headless";
import { $convertFromMarkdownString } from "@lexical/markdown";
import { $generateHtmlFromNodes } from "@lexical/html";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { parseHTML } from "linkedom";
import theme from "../core/theme";
import { setupPrism } from "./setupPrism";

import {
  ServerImageNode,
  ServerYouTubeNode,
  ServerTweetNode,
  ServerHorizontalRuleNode,
} from "./serverNodes";
import { SERVER_TRANSFORMERS } from "./serverTransformers";
import { preprocessMarkdown } from "../core/preprocessMarkdown";
import { normalizeGeneratedLexicalHtml } from "./normalizeGeneratedLexicalHtml";

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

function createHtmlFromMarkdown(processedMarkdown: string): string {
  setupPrism();

  const editor = createHeadlessEditor({
    theme,
    nodes: ServerEditorNodes,
    onError: (error) => {
      console.error("[generateHtmlFromMarkdown] Lexical error:", error);
    },
  });
  const unregisterCodeHighlighting = registerCodeHighlighting(editor);

  editor.update(
    () => {
      $convertFromMarkdownString(processedMarkdown, SERVER_TRANSFORMERS);
    },
    { discrete: true }
  );

  let html = "";
  editor.update(
    () => {
      html = $generateHtmlFromNodes(editor);
    },
    { discrete: true }
  );
  unregisterCodeHighlighting();

  return normalizeGeneratedLexicalHtml(html);
}

function setGlobalDom(key: "window" | "document", value: unknown): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  if (descriptor && !descriptor.writable && !descriptor.set) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: descriptor.enumerable ?? true,
      writable: true,
      value,
    });
    return;
  }

  (globalThis as Record<string, unknown>)[key] = value;
}

/**
 * 마크다운 → HTML 문자열 변환
 * linkedom으로 DOM 환경을 제공하고 $generateHtmlFromNodes()로 HTML 생성
 */
export function generateHtmlFromMarkdown(markdown: string): string {
  if (!markdown) return "";

  const processedMarkdown = preprocessMarkdown(markdown);

  // 브라우저 환경에서는 기존 DOM을 그대로 사용
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return createHtmlFromMarkdown(processedMarkdown);
  }

  // linkedom으로 서버 DOM 환경 생성
  const { document: domDocument, window: domWindow } = parseHTML(
    "<!DOCTYPE html><html><body></body></html>"
  );

  // 전역 DOM 환경 설정 ($generateHtmlFromNodes가 필요로 함)
  const hasPrevWindow = Object.prototype.hasOwnProperty.call(globalThis, "window");
  const hasPrevDocument = Object.prototype.hasOwnProperty.call(globalThis, "document");
  const prevWindow = (globalThis as Record<string, unknown>).window;
  const prevDocument = (globalThis as Record<string, unknown>).document;

  setGlobalDom("window", domWindow as unknown as Window & typeof globalThis);
  setGlobalDom("document", domDocument as unknown as Document);

  try {
    return createHtmlFromMarkdown(processedMarkdown);
  } finally {
    // 전역 DOM 환경 복원
    if (!hasPrevWindow) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      setGlobalDom("window", prevWindow);
    }

    if (!hasPrevDocument) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      setGlobalDom("document", prevDocument);
    }
  }
}
