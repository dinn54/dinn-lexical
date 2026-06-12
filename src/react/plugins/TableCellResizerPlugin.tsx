"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeFromDOMNode } from "lexical";
import {
  $findTableNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from "@lexical/table";
import { useEffect, useRef } from "react";

const EDGE_HIT_AREA_PX = 8;
const MIN_CELL_WIDTH_PX = 80;
const MIN_ROW_HEIGHT_PX = 36;
export const TABLE_CELL_RESIZE_STATE_EVENT = "table-cell-resize-state";

function getClosestCellElement(
  target: EventTarget | null,
  root: HTMLElement,
): HTMLTableCellElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const cell = target.closest("td,th");
  if (!cell || !root.contains(cell)) return null;
  return cell as HTMLTableCellElement;
}

function getTableColumnWidths(tableElement: HTMLTableElement): number[] {
  const colElements = Array.from(
    tableElement.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col"),
  );

  const colWidths = colElements
    .map((colElement) => Math.round(colElement.getBoundingClientRect().width))
    .filter((width) => width > 0);

  if (colElements.length > 0 && colWidths.length === colElements.length) {
    return colWidths;
  }

  const firstRow = tableElement.querySelector(
    ":scope > tbody > tr, :scope > thead > tr, :scope > tr",
  );
  if (!firstRow) return [];

  return Array.from(firstRow.children)
    .map((cellElement) =>
      Math.round((cellElement as HTMLElement).getBoundingClientRect().width),
    )
    .filter((width) => width > 0);
}

function getCellColumnIndex(cellElement: HTMLTableCellElement): number {
  const rowElement = cellElement.parentElement;
  if (!(rowElement instanceof HTMLTableRowElement)) {
    return cellElement.cellIndex;
  }

  let columnIndex = 0;
  for (const sibling of Array.from(rowElement.cells)) {
    if (sibling === cellElement) return columnIndex;
    columnIndex += Math.max(sibling.colSpan || 1, 1);
  }

  return columnIndex;
}

function applyColumnWidth(
  tableElement: HTMLTableElement,
  columnIndex: number,
  width: number,
): void {
  const colElements = Array.from(
    tableElement.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col"),
  );
  const nextWidth = Math.max(MIN_CELL_WIDTH_PX, Math.round(width));

  if (colElements[columnIndex]) {
    colElements[columnIndex].style.width = `${nextWidth}px`;
    colElements[columnIndex].setAttribute("width", `${nextWidth}`);
  }

  const currentWidths = getTableColumnWidths(tableElement);
  if (currentWidths.length > 0) {
    const totalWidth = currentWidths.reduce((sum, value) => sum + value, 0);
    tableElement.style.width = `${totalWidth}px`;
    tableElement.style.maxWidth = "100%";
  }
}

function applyTableWidths(tableElement: HTMLTableElement, widths: number[]): void {
  widths.forEach((columnWidth, index) => {
    applyColumnWidth(tableElement, index, columnWidth);
  });

  const totalWidth = widths.reduce((sum, value) => sum + value, 0);
  if (totalWidth > 0) {
    tableElement.style.width = `${Math.round(totalWidth)}px`;
    tableElement.style.maxWidth = "100%";
  }
}

function getTableMaxWidth(tableElement: HTMLTableElement): number | null {
  const wrapperElement = tableElement.parentElement;
  if (!(wrapperElement instanceof HTMLElement)) return null;

  const width = Math.round(wrapperElement.getBoundingClientRect().width);
  return width > 0 ? width : null;
}

export default function TableCellResizerPlugin() {
  const [editor] = useLexicalComposerContext();
  const isResizingRef = useRef(false);
  const resizeModeRef = useRef<"col" | "row" | null>(null);
  const activeCellRef = useRef<HTMLTableCellElement | null>(null);
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);
  const activeColumnIndexRef = useRef<number | null>(null);
  const startColWidthsRef = useRef<number[]>([]);
  const startTableLeftOffsetRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const emitResizeState = (isResizing: boolean) => {
      window.dispatchEvent(
        new CustomEvent(TABLE_CELL_RESIZE_STATE_EVENT, {
          detail: { isResizing },
        }),
      );
    };

    const resetCursor = () => {
      root.style.cursor = "";
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!editor.isEditable()) return;

      if (isResizingRef.current) {
        if (resizeModeRef.current === "col" && activeCellRef.current) {
          const deltaX = event.clientX - startXRef.current;
          const nextWidth = Math.max(MIN_CELL_WIDTH_PX, startWidthRef.current + deltaX);
          const tableElement = activeCellRef.current.closest("table");
          if (tableElement instanceof HTMLTableElement) {
            const columnIndex =
              activeColumnIndexRef.current ?? getCellColumnIndex(activeCellRef.current);
            const baseWidths = startColWidthsRef.current.length
              ? [...startColWidthsRef.current]
              : getTableColumnWidths(tableElement);
            const nextColumnIndex = columnIndex + 1;

            if (baseWidths[columnIndex] != null && baseWidths[nextColumnIndex] != null) {
              const totalPairWidth = baseWidths[columnIndex] + baseWidths[nextColumnIndex];
              const constrainedWidth = Math.min(
                totalPairWidth - MIN_CELL_WIDTH_PX,
                Math.max(MIN_CELL_WIDTH_PX, nextWidth),
              );
              baseWidths[columnIndex] = constrainedWidth;
              baseWidths[nextColumnIndex] = totalPairWidth - constrainedWidth;
              applyTableWidths(tableElement, baseWidths);
            } else {
              const otherWidths = baseWidths.reduce(
                (sum, columnWidth, index) => (index === columnIndex ? sum : sum + columnWidth),
                0,
              );
              const maxTableWidth = getTableMaxWidth(tableElement);
              const maxColumnWidth =
                maxTableWidth != null
                  ? Math.max(MIN_CELL_WIDTH_PX, maxTableWidth - otherWidths)
                  : Number.POSITIVE_INFINITY;
              const constrainedWidth = Math.min(maxColumnWidth, nextWidth);

              baseWidths[columnIndex] = constrainedWidth;
              applyTableWidths(tableElement, baseWidths);

              if (startTableLeftOffsetRef.current != null) {
                tableElement.style.marginLeft = `${startTableLeftOffsetRef.current}px`;
                tableElement.style.marginRight = "auto";
              }
            }
          } else {
            activeCellRef.current.style.width = `${nextWidth}px`;
          }
        } else if (resizeModeRef.current === "row" && activeRowRef.current) {
          const deltaY = event.clientY - startYRef.current;
          const nextHeight = Math.max(MIN_ROW_HEIGHT_PX, startHeightRef.current + deltaY);
          activeRowRef.current.style.height = `${nextHeight}px`;
        }
        return;
      }

      const cell = getClosestCellElement(event.target, root);
      if (!cell) {
        resetCursor();
        return;
      }

      const rect = cell.getBoundingClientRect();
      const distanceToRight = rect.right - event.clientX;
      const distanceToBottom = rect.bottom - event.clientY;
      if (distanceToBottom >= 0 && distanceToBottom <= EDGE_HIT_AREA_PX) {
        root.style.cursor = "row-resize";
      } else if (distanceToRight >= 0 && distanceToRight <= EDGE_HIT_AREA_PX) {
        root.style.cursor = "col-resize";
      } else {
        resetCursor();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (!editor.isEditable() || event.button !== 0) return;

      const cell = getClosestCellElement(event.target, root);
      if (!cell) return;

      const rect = cell.getBoundingClientRect();
      const distanceToRight = rect.right - event.clientX;
      const distanceToBottom = rect.bottom - event.clientY;
      const nearRight = distanceToRight >= 0 && distanceToRight <= EDGE_HIT_AREA_PX;
      const nearBottom = distanceToBottom >= 0 && distanceToBottom <= EDGE_HIT_AREA_PX;
      if (!nearRight && !nearBottom) return;

      event.preventDefault();
      event.stopPropagation();

      isResizingRef.current = true;
      if (nearBottom && (!nearRight || distanceToBottom <= distanceToRight)) {
        const row = cell.closest("tr") as HTMLTableRowElement | null;
        if (!row) {
          isResizingRef.current = false;
          return;
        }
        resizeModeRef.current = "row";
        activeRowRef.current = row;
        startYRef.current = event.clientY;
        startHeightRef.current = row.getBoundingClientRect().height;
        root.style.cursor = "row-resize";
      } else {
        resizeModeRef.current = "col";
        activeCellRef.current = cell;
        const columnIndex = getCellColumnIndex(cell);
        activeColumnIndexRef.current = columnIndex;
        startXRef.current = event.clientX;
        const tableElement = cell.closest("table");
        if (tableElement instanceof HTMLTableElement) {
          const widths = getTableColumnWidths(tableElement);
          startColWidthsRef.current = widths;
          const wrapperElement = tableElement.parentElement;
          if (wrapperElement instanceof HTMLElement) {
            const tableRect = tableElement.getBoundingClientRect();
            const wrapperRect = wrapperElement.getBoundingClientRect();
            startTableLeftOffsetRef.current = Math.round(tableRect.left - wrapperRect.left);
          } else {
            startTableLeftOffsetRef.current = null;
          }
          startWidthRef.current = widths[columnIndex] ?? cell.getBoundingClientRect().width;
        } else {
          startColWidthsRef.current = [];
          startTableLeftOffsetRef.current = null;
          startWidthRef.current = cell.getBoundingClientRect().width;
        }
        root.style.cursor = "col-resize";
      }
      document.body.style.userSelect = "none";
      emitResizeState(true);
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;

      if (resizeModeRef.current === "col" && activeCellRef.current) {
        const cellEl = activeCellRef.current;
        const tableElement = cellEl.closest("table");
        const finalWidth = Math.max(
          MIN_CELL_WIDTH_PX,
          Math.round(cellEl.getBoundingClientRect().width),
        );
        const nextColWidths =
          tableElement instanceof HTMLTableElement ? getTableColumnWidths(tableElement) : [];

        editor.update(() => {
          const maybeNode = $getNearestNodeFromDOMNode(cellEl);
          if ($isTableCellNode(maybeNode)) {
            maybeNode.setWidth(finalWidth);

            const tableNode = $findTableNode(maybeNode);
            if ($isTableNode(tableNode) && nextColWidths.length > 0) {
              tableNode.setColWidths(nextColWidths);
            }
          }
        });
      }

      if (resizeModeRef.current === "row" && activeRowRef.current) {
        const rowEl = activeRowRef.current;
        const finalHeight = Math.max(
          MIN_ROW_HEIGHT_PX,
          Math.round(rowEl.getBoundingClientRect().height),
        );

        editor.update(() => {
          const maybeNode = $getNearestNodeFromDOMNode(rowEl);
          if ($isTableRowNode(maybeNode)) {
            maybeNode.setHeight(finalHeight);
          }
        });
      }

      isResizingRef.current = false;
      resizeModeRef.current = null;
      activeCellRef.current = null;
      activeRowRef.current = null;
      activeColumnIndexRef.current = null;
      startColWidthsRef.current = [];
      startTableLeftOffsetRef.current = null;
      document.body.style.userSelect = "";
      resetCursor();
      emitResizeState(false);
    };

    root.addEventListener("mousemove", handleMouseMove);
    root.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    root.addEventListener("mouseleave", resetCursor);

    return () => {
      root.removeEventListener("mousemove", handleMouseMove);
      root.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      root.removeEventListener("mouseleave", resetCursor);
      document.body.style.userSelect = "";
      resetCursor();
      emitResizeState(false);
    };
  }, [editor]);

  return null;
}
