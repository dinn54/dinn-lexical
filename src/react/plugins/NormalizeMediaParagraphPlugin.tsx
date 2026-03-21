"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isRootOrShadowRoot, $isParagraphNode, ParagraphNode } from "lexical";
import { $isImageNode } from "../nodes/ImageNode";
import { $isYouTubeNode } from "../nodes/YouTubeNode";
import { $isTweetNode } from "../nodes/TweetNode";
import { $isHorizontalRuleNode } from "../nodes/HorizontalRuleNode";

function isMediaNode(child: ReturnType<ParagraphNode["getChildren"]>[number]): boolean {
  return (
    $isImageNode(child) ||
    $isYouTubeNode(child) ||
    $isTweetNode(child) ||
    $isHorizontalRuleNode(child)
  );
}

function isStandaloneMediaParagraph(node: ParagraphNode): boolean {
  if (!$isRootOrShadowRoot(node.getParent())) {
    return false;
  }

  const children = node.getChildren();
  if (children.length === 0) {
    return false;
  }

  return children.every(isMediaNode);
}

export default function NormalizeMediaParagraphPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(ParagraphNode, (node) => {
      if (!isStandaloneMediaParagraph(node)) {
        return;
      }

      const mediaNode = node.getFirstChild();
      if (!mediaNode) {
        return;
      }

      const mediaNodes = node.getChildren();
      mediaNodes.forEach((child) => {
        node.insertBefore(child);
      });
      node.remove();
    });
  }, [editor]);

  return null;
}
