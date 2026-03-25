import { generateHtmlFromContent } from "../server/generateHtmlFromContent";
import { DetailLexicalViewerClient } from "./DetailLexicalViewerClient";
import { buildDetailViewerStyle } from "./detailViewerStyle";

type Dimension = number | string;

interface DetailLexicalViewerProps {
  content: string;
  className?: string;
  width?: Dimension;
  maxWidth?: Dimension;
}

export function DetailLexicalViewer({
  content,
  className,
  width,
  maxWidth,
}: DetailLexicalViewerProps) {
  const fallbackHtml = generateHtmlFromContent(content);
  const style = buildDetailViewerStyle(width, maxWidth);

  return (
    <DetailLexicalViewerClient
      fallbackHtml={fallbackHtml}
      className={className}
      style={style}
    />
  );
}
