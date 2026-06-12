"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $isTableCellNode,
  $isTableRowNode,
  $isTableSelection,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  TableCellHeaderStates,
  TableCellNode,
} from "@lexical/table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { TABLE_CELL_RESIZE_STATE_EVENT } from "./TableCellResizerPlugin";

type ActiveCellState = {
  keys: string[];
  rect: DOMRect;
  backgroundColor: string;
  verticalAlign: string;
};

const DEFAULT_CELL_BG = "#ffffff";
const DEFAULT_HEADER_BG = "#f8fafc";

function areSameCellKeys(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((key, index) => key === right[index])
  );
}

function getSelectedTableCellsFromSelection(): TableCellNode[] {
  const selection = $getSelection();
  if (!selection) return [];

  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    const cell =
      $getTableCellNodeFromLexicalNode(anchorNode) ||
      $getTableCellNodeFromLexicalNode(focusNode);
    return cell ? [cell] : [];
  }

  if ($isTableSelection(selection)) {
    const cellMap = new Map<string, TableCellNode>();
    const anchorCell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
    if (anchorCell) cellMap.set(anchorCell.getKey(), anchorCell);
    const focusCell = $getTableCellNodeFromLexicalNode(selection.focus.getNode());
    if (focusCell) cellMap.set(focusCell.getKey(), focusCell);
    for (const node of selection.getNodes()) {
      const cell = $getTableCellNodeFromLexicalNode(node);
      if (cell) cellMap.set(cell.getKey(), cell);
    }
    return Array.from(cellMap.values());
  }

  return [];
}

function getCellDomElement(editor: ReturnType<typeof useLexicalComposerContext>[0], key: string) {
  const baseElement = editor.getElementByKey(key);
  if (!baseElement) return null;
  return (baseElement.closest("td,th") as HTMLElement | null) ?? baseElement;
}

export default function TableCellActionMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeCell, setActiveCell] = useState<ActiveCellState | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [overlayElement, setOverlayElement] = useState<HTMLElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const activeCellRef = useRef<ActiveCellState | null>(null);
  const menuTargetKeysRef = useRef<string[] | null>(null);
  const rafRef = useRef<number | null>(null);
  const isColorPickingRef = useRef(false);
  const colorApplyRafRef = useRef<number | null>(null);
  const pendingColorRef = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const isMenuOpenRef = useRef(false);

  useEffect(() => {
    activeCellRef.current = activeCell;
  }, [activeCell]);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  useEffect(() => {
    const resolveOverlayElement = () => {
      const root = editor.getRootElement();
      if (!root) {
        setOverlayElement(null);
        return;
      }

      const scrollArea =
        (root.closest("[data-editor-scroll-area]") as HTMLElement | null) ||
        root.parentElement;
      const overlayParent = scrollArea?.parentElement ?? scrollArea;
      setOverlayElement(overlayParent);
    };

    resolveOverlayElement();
    window.addEventListener("resize", resolveOverlayElement);
    return () => window.removeEventListener("resize", resolveOverlayElement);
  }, [editor]);

  const refreshActiveCell = useCallback(
    (forceGeometry = false) => {
      editor.getEditorState().read(() => {
        const tableCells = getSelectedTableCellsFromSelection();
        if (tableCells.length === 0) {
          setActiveCell(null);
          return;
        }

        const nextKeys = tableCells.map((cell) => cell.getKey());
        const firstCell = tableCells[0];
        const backgroundColor =
          firstCell.getBackgroundColor() ||
          (firstCell.hasHeader() ? DEFAULT_HEADER_BG : DEFAULT_CELL_BG);
        const verticalAlign = firstCell.getVerticalAlign() || "top";
        const prev = activeCellRef.current;
        const currentMenuTargetKeys = menuTargetKeysRef.current;
        if (
          isMenuOpenRef.current &&
          currentMenuTargetKeys &&
          !areSameCellKeys(currentMenuTargetKeys, nextKeys)
        ) {
          menuTargetKeysRef.current = null;
          setIsMenuOpen(false);
        }
        const sameSelection = !!prev && areSameCellKeys(prev.keys, nextKeys);

        if (sameSelection && !forceGeometry && prev) {
          if (
            prev.backgroundColor !== backgroundColor ||
            prev.verticalAlign !== verticalAlign
          ) {
            setActiveCell({
              ...prev,
              backgroundColor,
              verticalAlign,
            });
          }
          return;
        }

        const cellRects = tableCells
          .map((cell) => getCellDomElement(editor, cell.getKey())?.getBoundingClientRect() ?? null)
          .filter((rect): rect is DOMRect => rect !== null);
        if (cellRects.length === 0) {
          setActiveCell(null);
          return;
        }

        const minTop = Math.min(...cellRects.map((rect) => rect.top));
        const minLeft = Math.min(...cellRects.map((rect) => rect.left));
        const maxRight = Math.max(...cellRects.map((rect) => rect.right));
        const maxBottom = Math.max(...cellRects.map((rect) => rect.bottom));
        setActiveCell({
          keys: nextKeys,
          rect: new DOMRect(minLeft, minTop, maxRight - minLeft, maxBottom - minTop),
          backgroundColor,
          verticalAlign,
        });
      });
    },
    [editor],
  );

  const scheduleRefreshActiveCell = useCallback(
    (forceGeometry = false) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        refreshActiveCell(forceGeometry);
      });
    },
    [refreshActiveCell],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          scheduleRefreshActiveCell(true);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerUpdateListener(() => {
        if (isColorPickingRef.current) return;
        scheduleRefreshActiveCell(false);
      }),
    );
  }, [editor, scheduleRefreshActiveCell]);

  useEffect(() => {
    const onWindowChange = () => scheduleRefreshActiveCell(true);
    const onScroll = () => {
      setIsScrolling(true);
      onWindowChange();
      if (scrollTimeoutRef.current !== null) window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        scrollTimeoutRef.current = null;
        setIsScrolling(false);
      }, 120);
    };

    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onScroll, true);
      if (scrollTimeoutRef.current !== null) window.clearTimeout(scrollTimeoutRef.current);
    };
  }, [scheduleRefreshActiveCell]);

  useEffect(() => {
    const onResizeStateChange = (event: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { isResizing?: boolean } | undefined)
          : undefined;
      setIsResizing(Boolean(detail?.isResizing));
    };

    window.addEventListener(TABLE_CELL_RESIZE_STATE_EVENT, onResizeStateChange);
    return () => window.removeEventListener(TABLE_CELL_RESIZE_STATE_EVENT, onResizeStateChange);
  }, []);

  const applyPendingColor = useCallback(() => {
    const color = pendingColorRef.current;
    if (!color) return;
    const cellKeys = menuTargetKeysRef.current ?? activeCellRef.current?.keys ?? [];
    if (cellKeys.length === 0) return;
    editor.update(() => {
      for (const key of cellKeys) {
        const cellNode = $getNodeByKey(key);
        if (!$isTableCellNode(cellNode)) continue;
        cellNode.setBackgroundColor(color);
      }
    });
  }, [editor]);

  const flushColorPicking = useCallback(() => {
    if (!isColorPickingRef.current) return;
    if (colorApplyRafRef.current !== null) {
      cancelAnimationFrame(colorApplyRafRef.current);
      colorApplyRafRef.current = null;
    }
    applyPendingColor();
    pendingColorRef.current = null;
    isColorPickingRef.current = false;
    scheduleRefreshActiveCell(false);
  }, [applyPendingColor, scheduleRefreshActiveCell]);

  useEffect(() => {
    const onPointerUp = () => flushColorPicking();
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("mouseup", onPointerUp, true);
    return () => {
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("mouseup", onPointerUp, true);
    };
  }, [flushColorPicking]);

  const queueBackgroundColorChange = useCallback(
    (color: string) => {
      const prev = activeCellRef.current;
      if (prev && prev.backgroundColor !== color) {
        setActiveCell({ ...prev, backgroundColor: color });
      }
      isColorPickingRef.current = true;
      pendingColorRef.current = color;
      if (colorApplyRafRef.current !== null) return;
      colorApplyRafRef.current = requestAnimationFrame(() => {
        colorApplyRafRef.current = null;
        applyPendingColor();
      });
    },
    [applyPendingColor],
  );

  const runInUpdate = useCallback(
    (fn: (cellNode: TableCellNode) => void, mode: "all" | "primary" = "primary") => {
      const cellKeys = menuTargetKeysRef.current ?? activeCell?.keys ?? [];
      if (cellKeys.length === 0) return;
      editor.update(() => {
        const targetKeys = mode === "all" ? cellKeys : [cellKeys[0]];
        for (const key of targetKeys) {
          const cellNode = $getNodeByKey(key);
          if (!$isTableCellNode(cellNode)) continue;
          fn(cellNode);
        }
      });
    },
    [activeCell?.keys, editor],
  );

  const canShow = useMemo(() => {
    return (
      !isResizing &&
      !isScrolling &&
      activeCell &&
      overlayElement &&
      Number.isFinite(activeCell.rect.top) &&
      Number.isFinite(activeCell.rect.left)
    );
  }, [activeCell, isResizing, isScrolling, overlayElement]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const close = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("[data-dinn-lexical-table-menu]")) {
        return;
      }
      setIsMenuOpen(false);
      menuTargetKeysRef.current = null;
      flushColorPicking();
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [flushColorPicking, isMenuOpen]);

  if (!canShow || !activeCell || !overlayElement) return null;

  const overlayRect = overlayElement.getBoundingClientRect();
  const menuTop = activeCell.rect.top - overlayRect.top + 4;
  const menuLeft = activeCell.rect.right - overlayRect.left - 34;

  return createPortal(
    <div
      className="dinn-lexical-table-menu"
      data-dinn-lexical-table-menu
      style={{ top: menuTop, left: menuLeft }}
    >
      <button
        type="button"
        aria-label="테이블 셀 설정"
        className="dinn-lexical-table-menu-trigger"
        onClick={() => {
          setIsMenuOpen((open) => {
            const nextOpen = !open;
            menuTargetKeysRef.current = nextOpen ? activeCell.keys : null;
            if (!nextOpen) flushColorPicking();
            return nextOpen;
          });
        }}
      >
        ⋯
      </button>
      {isMenuOpen && (
        <div className="dinn-lexical-table-menu-content">
          <div className="dinn-lexical-table-menu-title">표 설정</div>
          <div className="dinn-lexical-table-menu-row">
            <label className="dinn-lexical-table-menu-label">배경색</label>
            <button
              type="button"
              aria-label="배경색 선택"
              className="dinn-lexical-color-swatch"
              style={{ backgroundColor: activeCell.backgroundColor }}
              onClick={() => colorInputRef.current?.click()}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={activeCell.backgroundColor}
              onInput={(event) =>
                queueBackgroundColorChange((event.target as HTMLInputElement).value)
              }
              onChange={(event) =>
                queueBackgroundColorChange((event.target as HTMLInputElement).value)
              }
              onBlur={() => flushColorPicking()}
              className="dinn-lexical-visually-hidden"
            />
          </div>
          <div className="dinn-lexical-table-menu-label">세로 정렬</div>
          <div className="dinn-lexical-table-menu-grid">
            {[
              { value: "top", label: "위" },
              { value: "middle", label: "가운데" },
              { value: "bottom", label: "아래" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  activeCell.verticalAlign === option.value
                    ? "dinn-lexical-table-menu-button is-active"
                    : "dinn-lexical-table-menu-button"
                }
                onClick={() =>
                  runInUpdate((cell) => cell.setVerticalAlign(option.value), "all")
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="dinn-lexical-table-menu-separator" />
          <button type="button" onClick={() => runInUpdate(() => void $insertTableRowAtSelection(false))}>위에 행 추가</button>
          <button type="button" onClick={() => runInUpdate(() => void $insertTableRowAtSelection(true))}>아래에 행 추가</button>
          <button type="button" onClick={() => runInUpdate(() => void $insertTableColumnAtSelection(false))}>왼쪽에 열 추가</button>
          <button type="button" onClick={() => runInUpdate(() => void $insertTableColumnAtSelection(true))}>오른쪽에 열 추가</button>
          <button type="button" onClick={() => runInUpdate(() => $deleteTableColumnAtSelection())}>열 삭제</button>
          <button type="button" onClick={() => runInUpdate(() => $deleteTableRowAtSelection())}>행 삭제</button>
          <button
            type="button"
            onClick={() =>
              runInUpdate((cell) => {
                const table = $getTableNodeFromLexicalNodeOrThrow(cell);
                const firstRow = table.getFirstChild();
                if (!$isTableRowNode(firstRow)) return;
                const firstCell = firstRow.getFirstChild();
                const enable =
                  !$isTableCellNode(firstCell) ||
                  !firstCell.hasHeaderState(TableCellHeaderStates.ROW);

                firstRow.getChildren().forEach((cellNode) => {
                  if ($isTableCellNode(cellNode)) {
                    cellNode.setHeaderStyles(
                      enable
                        ? TableCellHeaderStates.ROW
                        : TableCellHeaderStates.NO_STATUS,
                      TableCellHeaderStates.ROW,
                    );
                  }
                });
              })
            }
          >
            행 헤더 토글
          </button>
          <button
            type="button"
            onClick={() =>
              runInUpdate((cell) => {
                const table = $getTableNodeFromLexicalNodeOrThrow(cell);
                const firstRow = table.getFirstChild();
                if (!$isTableRowNode(firstRow)) return;
                const firstCell = firstRow.getFirstChild();
                const enable =
                  !$isTableCellNode(firstCell) ||
                  !firstCell.hasHeaderState(TableCellHeaderStates.COLUMN);

                table.getChildren().forEach((row) => {
                  if (!$isTableRowNode(row)) return;
                  const target = row.getFirstChild();
                  if ($isTableCellNode(target)) {
                    target.setHeaderStyles(
                      enable
                        ? TableCellHeaderStates.COLUMN
                        : TableCellHeaderStates.NO_STATUS,
                      TableCellHeaderStates.COLUMN,
                    );
                  }
                });
              })
            }
          >
            열 헤더 토글
          </button>
          <div className="dinn-lexical-table-menu-separator" />
          <button
            type="button"
            className="is-danger"
            onClick={() =>
              runInUpdate((cell) => {
                const table = $getTableNodeFromLexicalNodeOrThrow(cell);
                table.remove();
              })
            }
          >
            표 삭제
          </button>
        </div>
      )}
    </div>,
    overlayElement,
  );
}
