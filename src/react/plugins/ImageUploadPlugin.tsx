"use client";

import { useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_EDITOR, PASTE_COMMAND } from "lexical";

import {
  getImageFilesFromDataTransfer,
  type ImageUploadHandler,
  type ImageUploadSource,
} from "../imageUpload";
import { INSERT_IMAGE_COMMAND } from "../nodes/ImageNode";

function getClipboardImageFiles(event: Event): File[] {
  if (!("clipboardData" in event)) return [];
  return getImageFilesFromDataTransfer(event.clipboardData as DataTransfer | null);
}

export function ImageUploadPlugin({
  onImageUpload,
  onImageUploadError,
}: {
  onImageUpload: ImageUploadHandler;
  onImageUploadError?: (error: unknown) => void;
}) {
  const [editor] = useLexicalComposerContext();

  const uploadFiles = useCallback(
    (files: File[], source: ImageUploadSource) => {
      if (files.length === 0) return;

      void (async () => {
        try {
          for (const file of files) {
            const uploaded = await onImageUpload(file, { source });

            editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
              src: uploaded.src,
              altText: uploaded.altText ?? file.name ?? "",
              width: uploaded.width ?? undefined,
              height: uploaded.height ?? undefined,
            });
          }
        } catch (error) {
          onImageUploadError?.(error);
        }
      })();
    },
    [editor, onImageUpload, onImageUploadError],
  );

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const files = getClipboardImageFiles(event);
        if (files.length === 0) return false;

        event.preventDefault();
        uploadFiles(files, "paste");

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, uploadFiles]);

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const handleDragOver = (event: DragEvent) => {
      if (getImageFilesFromDataTransfer(event.dataTransfer).length === 0) return;
      event.preventDefault();
    };

    const handleDrop = (event: DragEvent) => {
      const files = getImageFilesFromDataTransfer(event.dataTransfer);
      if (files.length === 0) return;

      event.preventDefault();
      uploadFiles(files, "drop");
    };

    root.addEventListener("dragover", handleDragOver);
    root.addEventListener("drop", handleDrop);

    return () => {
      root.removeEventListener("dragover", handleDragOver);
      root.removeEventListener("drop", handleDrop);
    };
  }, [editor, uploadFiles]);

  return null;
}
