import React from "react";
import theme from "../../core/theme";
import { getBlockAlignmentClass } from "../nodes/block-alignment";

type Alignment =
  | ""
  | "center"
  | "end"
  | "justify"
  | "left"
  | "right"
  | "start"
  | null
  | undefined;

export function AlignableBlock({
  children,
  format,
}: {
  children: React.ReactNode;
  format?: Alignment;
}) {
  return <div className={`flex w-full ${getBlockAlignmentClass(format)}`}>{children}</div>;
}

export const ResizableBlock = React.forwardRef<HTMLDivElement, {
  children: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  style?: React.CSSProperties;
}>(function ResizableBlock({
  children,
  className = "",
  isSelected = false,
  style,
}, ref) {
  return (
    <div
      ref={ref}
      className={`${theme.resizable.node} ${className} ${
        isSelected ? theme.embedBlock.focus : ""
      }`.trim()}
      style={style}
    >
      {children}
    </div>
  );
});

export function MediaFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${theme.resizable.frame} ${className}`.trim()}>{children}</div>;
}

export function MediaFigure({
  children,
  caption,
  as = "figure",
}: {
  children: React.ReactNode;
  caption?: React.ReactNode;
  as?: "figure" | "span";
}) {
  const Component = as;

  return (
    <Component className={theme.image}>
      {children}
      {caption ? <figcaption className={theme.media.figcaption}>{caption}</figcaption> : null}
    </Component>
  );
}
