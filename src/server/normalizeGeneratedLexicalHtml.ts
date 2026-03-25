import { parseHTML } from "linkedom";
import theme from "../core/theme";
import { normalizeTableColumnWidths } from "../core/normalizeTableColumnWidths";

const DEFAULT_TABLE_CELL_WIDTH = "75px";
const DEFAULT_TABLE_HEADER_BACKGROUNDS = new Set(["#f2f3f5", "rgb(242, 243, 245)"]);

function addClassName(element: Element, ...classNames: Array<string | undefined>) {
  const next = classNames.filter(Boolean).join(" ").trim();
  if (!next) {
    return;
  }

  element.classList.add(...next.split(/\s+/));
}

export function normalizeGeneratedLexicalHtml(html: string): string {
  if (!html) {
    return html;
  }

  const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const body = document.body;

  body.querySelectorAll("hr").forEach((element) => {
    addClassName(element, theme.hr);

    const block = document.createElement("div");
    addClassName(block, theme.hrBlock);

    const inner = document.createElement("div");
    addClassName(inner, theme.hrInner);

    element.replaceWith(block);
    inner.appendChild(element);
    block.appendChild(inner);
  });

  body.querySelectorAll("table").forEach((tableElement) => {
    addClassName(tableElement, theme.table);

    const tbody = tableElement.querySelector(":scope > tbody");
    if (tbody) {
      addClassName(tbody, theme.tableBody);
    }

    tableElement.querySelectorAll("th, td").forEach((cellElement) => {
      const htmlCellElement = cellElement as HTMLElement;

      addClassName(
        htmlCellElement,
        theme.tableCell,
        htmlCellElement.tagName === "TH" ? theme.tableCellHeader : undefined,
      );

      htmlCellElement.removeAttribute("data-temporary-table-cell-lexical-key");

      const { style } = htmlCellElement;
      style.removeProperty("border");

      const normalizedTextAlign = style.textAlign.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalizedTextAlign === "start" || normalizedTextAlign === "left") {
        style.removeProperty("text-align");
      }

      if (style.width === DEFAULT_TABLE_CELL_WIDTH) {
        style.removeProperty("width");
      }

      if (style.verticalAlign === "top") {
        style.removeProperty("vertical-align");
      }

      if (
        htmlCellElement.tagName === "TH" &&
        DEFAULT_TABLE_HEADER_BACKGROUNDS.has(style.backgroundColor.replace(/\s+/g, " ").trim())
      ) {
        style.removeProperty("background-color");
      }

      if (!htmlCellElement.getAttribute("style")) {
        htmlCellElement.removeAttribute("style");
      }
    });
  });

  normalizeTableColumnWidths(body);

  body.querySelectorAll("pre.editor-code-block").forEach((codeBlockElement) => {
    codeBlockElement.querySelectorAll<HTMLElement>("span").forEach((tokenElement) => {
      if (tokenElement.style.whiteSpace === "pre-wrap") {
        tokenElement.style.removeProperty("white-space");
      }

      if (!tokenElement.getAttribute("style")) {
        tokenElement.removeAttribute("style");
      }
    });
  });

  body.querySelectorAll("p").forEach((paragraphElement) => {
    const childElements = Array.from(paragraphElement.children);
    if (childElements.length === 0) {
      return;
    }
    const hasOnlyWhitespaceText = Array.from(paragraphElement.childNodes).every((node) => {
      if (node.nodeType === node.ELEMENT_NODE) {
        return true;
      }

      return node.textContent?.trim() === "";
    });

    if (!hasOnlyWhitespaceText) {
      return;
    }

    const areAllMediaBlocks = childElements.every((childElement) => {
      return (
        childElement.matches("figure") ||
        childElement.matches(`.${theme.image}`) ||
        childElement.matches(`.${theme.embedBlock.base}`) ||
        childElement.matches("img") ||
        childElement.matches("iframe") ||
        childElement.hasAttribute("data-lexical-tweet-id")
      );
    });

    if (!areAllMediaBlocks) {
      return;
    }

    childElements.forEach((childElement) => {
      paragraphElement.before(childElement);
    });
    paragraphElement.remove();
  });

  body.querySelectorAll("p").forEach((paragraphElement) => {
    const text = paragraphElement.textContent?.trim() ?? "";
    if (text !== "") {
      return;
    }

    if (paragraphElement.children.length > 0) {
      return;
    }

    const previousElement = paragraphElement.previousElementSibling;
    const nextElement = paragraphElement.nextElementSibling;
    const isAdjacentToMedia =
      previousElement?.matches("figure, .editor-embed-block") ||
      nextElement?.matches("figure, .editor-embed-block");

    if (isAdjacentToMedia) {
      paragraphElement.remove();
    }
  });

  return body.innerHTML;
}
