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
} from "lexical";
import React from "react";
import LexicalYouTubeComponent from "./LexicalYouTubeComponent";

export type SerializedYouTubeNode = Spread<
  {
    videoID: string;
    format?: ElementFormatType;
    width?: number;
  },
  SerializedLexicalNode
>;

export class YouTubeNode extends DecoratorNode<React.JSX.Element> {
  __videoID: string;
  __format?: ElementFormatType;
  __width: number;

  static getType(): string {
    return "youtube";
  }

  static clone(node: YouTubeNode): YouTubeNode {
    return new YouTubeNode(node.__videoID, node.__format, node.__width, node.__key);
  }

  static importJSON(serializedNode: SerializedYouTubeNode): YouTubeNode {
    const node = $createYouTubeNode(serializedNode.videoID);
    node.setFormat(serializedNode.format);
    if (serializedNode.width) {
      node.setWidth(serializedNode.width);
    }
    return node;
  }

  exportJSON(): SerializedYouTubeNode {
    return {
      type: "youtube",
      version: 1,
      videoID: this.__videoID,
      format: this.__format,
      width: this.__width,
    };
  }

  constructor(
    videoID: string,
    format?: ElementFormatType,
    width?: number,
    key?: NodeKey
  ) {
    super(key);
    this.__videoID = videoID;
    this.__format = format;
    this.__width = width || 560;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("iframe");
    element.setAttribute("data-lexical-youtube", this.__videoID);
    element.setAttribute("width", this.__width.toString());
    element.setAttribute("height", "315");
    element.setAttribute(
      "src",
      `https://www.youtube.com/embed/${this.__videoID}`
    );
    element.setAttribute("frameborder", "0");
    element.setAttribute("allowfullscreen", "true");
    element.style.width = `${this.__width}px`;
    element.style.maxWidth = "100%";
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      iframe: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-youtube")) {
          return null;
        }
        return {
          conversion: convertYouTubeElement,
          priority: 1,
        };
      },
    };
  }

  updateDOM(): false {
    return false;
  }

  getId(): string {
    return this.__videoID;
  }

  getTextContent(
    _includeInert?: boolean | undefined,
    _includeDirectionless?: false | undefined
  ): string {
    return `https://www.youtube.com/watch?v=${this.__videoID}`;
  }

  setFormat(format: ElementFormatType | undefined): void {
    const writable = this.getWritable();
    writable.__format = format;
  }

  setWidth(width: number): void {
    const writable = this.getWritable();
    writable.__width = width;
  }

  getWidth(): number {
    return this.__width;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement("div");
    const theme = config.theme;
    const className = theme.embedBlock?.base || "editor-embed-block";
    div.className = className;
    return div;
  }

  decorate(): React.JSX.Element {
    return (
      <LexicalYouTubeComponent
        format={this.__format || null}
        nodeKey={this.getKey()}
        videoID={this.__videoID}
        width={this.__width}
        className={{ base: "", focus: "" }}
      />
    );
  }
}

export function $createYouTubeNode(videoID: string): YouTubeNode {
  return new YouTubeNode(videoID);
}

export function $isYouTubeNode(
  node: YouTubeNode | LexicalNode | null | undefined
): node is YouTubeNode {
  return node instanceof YouTubeNode;
}

function convertYouTubeElement(
  domNode: HTMLElement
): DOMConversionOutput | null {
  const videoID = domNode.getAttribute("data-lexical-youtube");
  if (videoID) {
    const node = $createYouTubeNode(videoID);
    return { node };
  }
  return null;
}
