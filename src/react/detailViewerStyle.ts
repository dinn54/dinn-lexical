import type React from "react";

type Dimension = number | string | undefined;

function toCssDimension(value: Dimension): string | undefined {
  if (value == null) {
    return undefined;
  }

  return typeof value === "number" ? `${value}px` : value;
}

export function buildDetailViewerStyle(
  width?: Dimension,
  maxWidth?: Dimension
): React.CSSProperties | undefined {
  const resolvedWidth = toCssDimension(width);
  const resolvedMaxWidth = toCssDimension(maxWidth);

  if (!resolvedWidth && !resolvedMaxWidth) {
    return undefined;
  }

  return {
    width: resolvedWidth,
    maxWidth: resolvedMaxWidth,
  };
}
