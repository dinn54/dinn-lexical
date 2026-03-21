import { ElementFormatType } from "lexical";

export function getBlockAlignmentClass(
  format?: ElementFormatType | null
): string {
  switch (format) {
    case "center":
      return "justify-center";
    case "right":
    case "end":
      return "justify-end";
    default:
      return "justify-start";
  }
}
