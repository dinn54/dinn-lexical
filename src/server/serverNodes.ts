/**
 * 서버측 마크다운 파싱용 간소화된 Lexical 노드
 * DecoratorNode의 decorate()가 React 컴포넌트를 반환하므로
 * 서버에서는 사용할 수 없다. 대신 JSON 직렬화만 지원하는 노드를 정의한다.
 */

import {
  DecoratorNode,
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import theme from "../core/theme";

// ========== Horizontal Rule Node (서버용) ==========
export type SerializedServerHorizontalRuleNode = SerializedLexicalNode;

export class ServerHorizontalRuleNode extends DecoratorNode<null> {
  static getType(): string {
    return "horizontalrule";
  }

  static clone(node: ServerHorizontalRuleNode): ServerHorizontalRuleNode {
    return new ServerHorizontalRuleNode(node.__key);
  }

  static importJSON(): ServerHorizontalRuleNode {
    return $createServerHorizontalRuleNode();
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  exportJSON(): SerializedServerHorizontalRuleNode {
    return {
      type: "horizontalrule",
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    return document.createElement("hr");
  }

  updateDOM(): false {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      hr: () => ({
        conversion: () => ({ node: $createServerHorizontalRuleNode() }),
        priority: 0,
      }),
    };
  }

  getTextContent(): string {
    return "\n";
  }

  isInline(): false {
    return false;
  }

  decorate(): null {
    return null;
  }
}

export function $createServerHorizontalRuleNode(): ServerHorizontalRuleNode {
  return new ServerHorizontalRuleNode();
}

export function $isServerHorizontalRuleNode(
  node: LexicalNode | null | undefined
): node is ServerHorizontalRuleNode {
  return node instanceof ServerHorizontalRuleNode;
}

// ========== Image Node ==========
export type SerializedServerImageNode = Spread<
  {
    src: string;
    altText: string;
    width: number;
    maxWidth: number;
  },
  SerializedLexicalNode
>;

export class ServerImageNode extends DecoratorNode<null> {
  __src: string;
  __altText: string;
  __width: number;
  __maxWidth: number;

  static getType(): string {
    return "image";
  }

  static clone(node: ServerImageNode): ServerImageNode {
    return new ServerImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__maxWidth,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedServerImageNode): ServerImageNode {
    return new ServerImageNode(
      serializedNode.src,
      serializedNode.altText,
      serializedNode.width,
      serializedNode.maxWidth
    );
  }

  constructor(
    src: string,
    altText: string,
    width: number,
    maxWidth: number,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__maxWidth = maxWidth;
  }

  exportJSON(): SerializedServerImageNode {
    return {
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      maxWidth: this.__maxWidth,
    };
  }

  createDOM(): HTMLElement {
    return document.createElement("span");
  }

  updateDOM(): false {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    const wrapper = document.createElement("span");
    wrapper.className = theme.image;

    const resizable = document.createElement("span");
    resizable.className = theme.resizable.node;
    resizable.style.width = `${this.__width}px`;
    resizable.style.maxWidth = "100%";

    const frame = document.createElement("span");
    frame.className = theme.media.frame;

    const element = document.createElement("img");
    element.className = theme.media.image;
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    element.setAttribute("width", this.__width.toString());
    element.style.width = "100%";
    element.style.height = "auto";
    element.style.maxWidth = "100%";

    frame.appendChild(element);
    resizable.appendChild(frame);
    wrapper.appendChild(resizable);

    return { element: wrapper };
  }

  decorate(): null {
    return null;
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

  getWidth(): number {
    return this.__width;
  }
}

export function $createServerImageNode({
  src,
  altText,
  width,
  maxWidth,
}: {
  src: string;
  altText: string;
  width: number;
  maxWidth: number;
}): ServerImageNode {
  return new ServerImageNode(src, altText, width, maxWidth);
}

export function $isServerImageNode(
  node: LexicalNode | null | undefined
): node is ServerImageNode {
  return node instanceof ServerImageNode;
}

// ========== YouTube Node ==========
export type SerializedServerYouTubeNode = Spread<
  {
    videoID: string;
    width: number;
  },
  SerializedLexicalNode
>;

export class ServerYouTubeNode extends DecoratorNode<null> {
  __videoID: string;
  __width: number;

  static getType(): string {
    return "youtube";
  }

  static clone(node: ServerYouTubeNode): ServerYouTubeNode {
    return new ServerYouTubeNode(node.__videoID, node.__width, node.__key);
  }

  static importJSON(serializedNode: SerializedServerYouTubeNode): ServerYouTubeNode {
    const node = new ServerYouTubeNode(serializedNode.videoID, serializedNode.width);
    return node;
  }

  constructor(videoID: string, width: number = 560, key?: NodeKey) {
    super(key);
    this.__videoID = videoID;
    this.__width = width;
  }

  exportJSON(): SerializedServerYouTubeNode {
    return {
      type: "youtube",
      version: 1,
      videoID: this.__videoID,
      width: this.__width,
    };
  }

  createDOM(): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): false {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    const wrapper = document.createElement("div");
    wrapper.className = `${theme.resizable.node} ${theme.embedBlock.base} ${theme.media.youtube}`.trim();
    wrapper.style.width = `min(100%, ${this.__width}px)`;
    wrapper.style.maxWidth = "100%";

    const frame = document.createElement("div");
    frame.className = theme.media.frame;

    const element = document.createElement("iframe");
    element.className = theme.media.aspectVideo;
    element.setAttribute("data-lexical-youtube", this.__videoID);
    element.setAttribute("src", `https://www.youtube.com/embed/${this.__videoID}`);
    element.setAttribute("frameborder", "0");
    element.setAttribute("allowfullscreen", "true");
    element.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    );
    element.setAttribute("title", "YouTube video player");

    frame.appendChild(element);
    wrapper.appendChild(frame);
    return { element: wrapper };
  }

  decorate(): null {
    return null;
  }

  getId(): string {
    return this.__videoID;
  }

  getWidth(): number {
    return this.__width;
  }

  setWidth(width: number): void {
    const writable = this.getWritable();
    writable.__width = width;
  }
}

export function $createServerYouTubeNode(videoID: string): ServerYouTubeNode {
  return new ServerYouTubeNode(videoID);
}

export function $isServerYouTubeNode(
  node: LexicalNode | null | undefined
): node is ServerYouTubeNode {
  return node instanceof ServerYouTubeNode;
}

// ========== Tweet Node ==========
export type SerializedServerTweetNode = Spread<
  {
    tweetID: string;
    width: number;
  },
  SerializedLexicalNode
>;

export class ServerTweetNode extends DecoratorNode<null> {
  __tweetID: string;
  __width: number;

  static getType(): string {
    return "tweet";
  }

  static clone(node: ServerTweetNode): ServerTweetNode {
    return new ServerTweetNode(node.__tweetID, node.__width, node.__key);
  }

  static importJSON(serializedNode: SerializedServerTweetNode): ServerTweetNode {
    return new ServerTweetNode(serializedNode.tweetID, serializedNode.width);
  }

  constructor(tweetID: string, width: number = 450, key?: NodeKey) {
    super(key);
    this.__tweetID = tweetID;
    this.__width = width;
  }

  exportJSON(): SerializedServerTweetNode {
    return {
      type: "tweet",
      version: 1,
      tweetID: this.__tweetID,
      width: this.__width,
    };
  }

  createDOM(): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): false {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    const wrapper = document.createElement("div");
    wrapper.className = `${theme.resizable.node} ${theme.embedBlock.base} ${theme.media.tweet}`.trim();
    wrapper.style.width = `min(100%, ${this.__width}px)`;
    wrapper.style.maxWidth = "100%";

    const frame = document.createElement("div");
    frame.className = theme.media.frame;

    const element = document.createElement("div");
    element.setAttribute("data-lexical-tweet-id", this.__tweetID);
    element.className = theme.media.tweetPlaceholder;
    element.style.width = `min(100%, ${this.__width}px)`;

    const body = document.createElement("div");
    body.className = theme.media.tweetPlaceholderBody;

    const eyebrow = document.createElement("div");
    eyebrow.className = theme.media.tweetPlaceholderEyebrow;
    eyebrow.textContent = "X Post";

    const label = document.createElement("span");
    label.className = theme.media.tweetPlaceholderText;
    label.textContent = `Post ${this.__tweetID}`;

    const link = document.createElement("a");
    link.className = theme.media.tweetPlaceholderLink;
    link.href = `https://x.com/i/status/${this.__tweetID}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open on X";

    body.appendChild(eyebrow);
    body.appendChild(label);
    body.appendChild(link);
    element.appendChild(body);

    frame.appendChild(element);
    wrapper.appendChild(frame);
    return { element: wrapper };
  }

  decorate(): null {
    return null;
  }

  getId(): string {
    return this.__tweetID;
  }

  getWidth(): number {
    return this.__width;
  }

  setWidth(width: number): void {
    const writable = this.getWritable();
    writable.__width = width;
  }
}

export function $createServerTweetNode(tweetID: string): ServerTweetNode {
  return new ServerTweetNode(tweetID);
}

export function $isServerTweetNode(
  node: LexicalNode | null | undefined
): node is ServerTweetNode {
  return node instanceof ServerTweetNode;
}
