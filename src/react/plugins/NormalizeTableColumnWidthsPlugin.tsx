"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { useEffect } from "react";

import { normalizeTableColumnWidths } from "../../core/normalizeTableColumnWidths";

export default function NormalizeTableColumnWidthsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let frameId = 0;

    const normalize = () => {
      const rootElement = editor.getRootElement();
      if (!rootElement) {
        return;
      }

      normalizeTableColumnWidths(rootElement);
    };

    const scheduleNormalize = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(normalize);
    };

    scheduleNormalize();

    return mergeRegister(
      editor.registerRootListener(() => {
        scheduleNormalize();
      }),
      editor.registerUpdateListener(() => {
        scheduleNormalize();
      }),
      () => {
        cancelAnimationFrame(frameId);
      }
    );
  }, [editor]);

  return null;
}
