"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isLinkNode, LinkNode, AutoLinkNode } from "@lexical/link";
import { useEffect } from "react";
import { $dfs } from "@lexical/utils";
import { $getRoot } from "lexical";

export default function OpenLinksInNewTabPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        editor.update(() => {
          const root = $getRoot();
          const nodes = $dfs(root);

          nodes.forEach((node) => {
            if ($isLinkNode(node.node)) {
              if (node.node.getTarget() !== "_blank") {
                node.node.setTarget("_blank");
                node.node.setRel("noopener noreferrer");
              }
            }
          });
        });
      });
    });
  }, [editor]);

  return null;
}
