import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalCommand,
  LexicalNode,
  NodeKey,
  Spread,
  createCommand,
  $applyNodeReplacement,
} from "lexical";
import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from "@lexical/react/LexicalDecoratorBlockNode";
import * as React from "react";
import TweetComponent from "./TweetComponent";

export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand(
  "INSERT_TWEET_COMMAND"
);

export type SerializedTweetNode = Spread<
  {
    tweetID: string;
    width?: number; // Add width to serialized node
  },
  SerializedDecoratorBlockNode
>;

export class TweetNode extends DecoratorBlockNode {
  __id: string;
  __width: number | "inherit";

  static getType(): string {
    return "tweet";
  }

  static clone(node: TweetNode): TweetNode {
    return new TweetNode(node.__id, node.__width, node.__format, node.__key);
  }

  static importJSON(serializedNode: SerializedTweetNode): TweetNode {
    const node = $createTweetNode(serializedNode.tweetID);
    node.setFormat(serializedNode.format);
    if (serializedNode.width) {
      node.setWidth(serializedNode.width);
    }
    return node;
  }

  exportJSON(): SerializedTweetNode {
    return {
      ...super.exportJSON(),
      type: "tweet",
      version: 1,
      tweetID: this.__id,
      width: this.__width === "inherit" ? undefined : this.__width,
    };
  }

  constructor(
    id: string,
    width?: number | "inherit",
    format?: ElementFormatType,
    key?: NodeKey
  ) {
    super(format, key);
    this.__id = id;
    this.__width = width || "inherit";
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.setAttribute("data-lexical-tweet-id", this.__id);
    if (this.__width !== "inherit") {
      element.style.width = `${this.__width}px`;
    }
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-tweet-id")) {
          return null;
        }
        return {
          conversion: convertTweetElement,
          priority: 2,
        };
      },
    };
  }

  updateDOM(): false {
    return false;
  }

  getId(): string {
    return this.__id;
  }

  setWidth(width: number | "inherit"): void {
    const writable = this.getWritable();
    writable.__width = width;
  }

  decorate(): React.ReactElement {
    return (
      <TweetComponent
        tweetID={this.__id}
        format={this.__format}
        nodeKey={this.getKey()}
        width={this.__width}
      />
    );
  }
}

function convertTweetElement(domNode: HTMLElement): DOMConversionOutput | null {
  const tweetID = domNode.getAttribute("data-lexical-tweet-id");
  if (tweetID) {
    const node = $createTweetNode(tweetID);
    return { node };
  }
  return null;
}

export function $createTweetNode(tweetID: string, width?: number): TweetNode {
  return $applyNodeReplacement(new TweetNode(tweetID, width));
}

export function $isTweetNode(
  node: LexicalNode | null | undefined
): node is TweetNode {
  return node instanceof TweetNode;
}
