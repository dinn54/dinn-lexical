const PIXEL_WIDTH_PATTERN = /^(-?\d+(?:\.\d+)?)px$/i;

function parsePixelWidth(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = value.trim().match(PIXEL_WIDTH_PATTERN);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getColumnWidths(tableElement: HTMLTableElement): number[] {
  const colElements = Array.from(
    tableElement.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")
  );

  const colWidths = colElements
    .map((colElement) => parsePixelWidth(colElement.style.width || colElement.getAttribute("width")))
    .filter((width): width is number => width != null);

  if (colWidths.length > 0) {
    return colWidths;
  }

  const firstRow = tableElement.querySelector(":scope > tbody > tr, :scope > thead > tr, :scope > tr");
  if (!firstRow) {
    return [];
  }

  return Array.from(firstRow.children)
    .map((cellElement) =>
      parsePixelWidth((cellElement as HTMLElement).style.width || cellElement.getAttribute("width"))
    )
    .filter((width): width is number => width != null);
}

function formatPercent(value: number): string {
  return `${Number.parseFloat(value.toFixed(4))}%`;
}

export function normalizeTableColumnWidths(root: ParentNode): void {
  const tableElements = Array.from(root.querySelectorAll<HTMLTableElement>("table.editor-table"));

  tableElements.forEach((tableElement) => {
    const columnWidths = getColumnWidths(tableElement);
    if (columnWidths.length === 0) {
      return;
    }

    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    if (!Number.isFinite(totalWidth) || totalWidth <= 0) {
      return;
    }

    const normalizedWidths = columnWidths.map((width) => formatPercent((width / totalWidth) * 100));

    tableElement.style.width = `${totalWidth}px`;
    tableElement.style.maxWidth = "100%";

    const colElements = Array.from(
      tableElement.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col")
    );

    colElements.forEach((colElement, index) => {
      const nextWidth = normalizedWidths[index];
      if (!nextWidth) {
        return;
      }

      colElement.style.width = nextWidth;
      colElement.removeAttribute("width");
    });

    tableElement.querySelectorAll<HTMLTableCellElement>("tr").forEach((rowElement) => {
      let columnIndex = 0;

      Array.from(rowElement.children).forEach((cellElement) => {
        if (cellElement.nodeType !== cellElement.ELEMENT_NODE) {
          return;
        }

        const htmlCellElement = cellElement as HTMLElement;
        const span = Math.max(Number.parseInt(htmlCellElement.getAttribute("colspan") || "1", 10) || 1, 1);
        const nextWidth = normalizedWidths
          .slice(columnIndex, columnIndex + span)
          .reduce((sum, value) => sum + Number.parseFloat(value), 0);

        if (nextWidth > 0) {
          htmlCellElement.style.width = formatPercent(nextWidth);
        }

        columnIndex += span;
      });
    });
  });
}
