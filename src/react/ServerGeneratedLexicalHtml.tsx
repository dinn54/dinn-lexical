import { generateHtmlFromContent } from "../server/generateHtmlFromContent";
import theme from "../core/theme";
import { cn } from "../core/cx";
import {
  readOnlyRenderContentClassName,
  readOnlyRenderFrameClassName,
  readOnlyRenderRootClassName,
  readOnlyRenderScrollAreaClassName,
} from "../core/readOnlyRenderShell";

interface ServerGeneratedLexicalHtmlProps {
  content: string;
  className?: string;
}

export function ServerGeneratedLexicalHtml({
  content,
  className,
}: ServerGeneratedLexicalHtmlProps) {
  const html = generateHtmlFromContent(content);

  return (
    <div className={cn(readOnlyRenderRootClassName, className)}>
      <div className={readOnlyRenderFrameClassName}>
        <div data-editor-scroll-area className={readOnlyRenderScrollAreaClassName}>
          <div
            className={cn(readOnlyRenderContentClassName, theme.root)}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
