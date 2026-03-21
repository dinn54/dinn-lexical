import {
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  ElementFormatType,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  createCommand,
  LexicalCommand,
} from "lexical";
import React from "react";
import LexicalImageComponent from "./LexicalImageComponent";

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  "INSERT_IMAGE_COMMAND"
);

export interface ImagePayload {
  altText: string;
  caption?: string; // Not used yet but kept for compatibility
  height?: number;
  key?: NodeKey;
  maxWidth?: number;
  showCaption?: boolean;
  src: string;
  width?: number;
  captionsEnabled?: boolean;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    caption: string;
    format?: ElementFormatType;
    height: number;
    maxWidth: number;
    showCaption: boolean;
    src: string;
    width: number;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;
  __width: "inherit" | number;
  __height: "inherit" | number;
  __maxWidth: number;
  __showCaption: boolean;
  __caption: string;
  __captionsEnabled: boolean;
  __format?: ElementFormatType;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__captionsEnabled,
      node.__format,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const {
      altText,
      format,
      height,
      width,
      maxWidth,
      caption,
      src,
      showCaption,
    } =
      serializedNode;
    return new ImageNode(
      src,
      altText,
      maxWidth,
      width,
      height,
      showCaption,
      caption
      ,
      undefined,
      format
    );
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    element.setAttribute("width", this.__width.toString());
    element.setAttribute("height", this.__height.toString());
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: "inherit" | number,
    height?: "inherit" | number,
    showCaption?: boolean,
    caption?: string,
    captionsEnabled?: boolean,
    format?: ElementFormatType,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || "inherit";
    this.__height = height || "inherit";
    this.__showCaption = showCaption || false;
    this.__caption = caption || "";
    this.__captionsEnabled = captionsEnabled || false;
    this.__format = format;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.__altText,
      caption: this.__caption,
      format: this.__format,
      height: this.__height === "inherit" ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      src: this.__src,
      type: "image",
      version: 1,
      width: this.__width === "inherit" ? 0 : this.__width,
    };
  }

  setWidthAndHeight(
    width: "inherit" | number,
    height: "inherit" | number
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  setFormat(format: ElementFormatType | undefined): void {
    const writable = this.getWritable();
    writable.__format = format;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    const theme = config.theme;
    const className = [theme.decoratorContents, theme.imageDecoratorContents]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  decorate(): React.JSX.Element {
    return (
      <LexicalImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
        format={this.__format || null}
        showCaption={this.__showCaption}
        caption={this.__caption}
        captionsEnabled={this.__captionsEnabled}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  captionsEnabled,
  src,
  width,
  showCaption,
  caption,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(
    src,
    altText,
    maxWidth,
    width,
    height,
    showCaption,
    caption,
    captionsEnabled,
    undefined,
    key
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}

function convertImageElement(domNode: Node): DOMConversionOutput | null {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src, width, height } = domNode;
    const node = $createImageNode({ altText, height, src, width });
    return { node };
  }
  return null;
}
