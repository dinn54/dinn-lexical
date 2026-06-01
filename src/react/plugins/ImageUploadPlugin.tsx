"use client";

import { useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  COMMAND_PRIORITY_EDITOR,
  PASTE_COMMAND,
  type NodeKey,
} from "lexical";
import { $insertNodeToNearestRoot } from "@lexical/utils";

import {
  getImageFilesFromDataTransfer,
  UPLOAD_IMAGE_FILES_COMMAND,
  type ImageUploadHandler,
  type ImageUploadSource,
} from "../imageUpload";
import { $createImageNode, $isImageNode } from "../nodes/ImageNode";

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

  const insertPreviewImage = useCallback(
    (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      let nodeKey: NodeKey | null = null;

      editor.update(() => {
        const node = $createImageNode({
          src: previewUrl,
          altText: file.name || "Uploading image",
        });
        $insertNodeToNearestRoot(node);
        nodeKey = node.getKey();
      });

      return { nodeKey, previewUrl };
    },
    [editor],
  );

  const removePreviewImage = useCallback(
    (nodeKey: NodeKey | null) => {
      if (!nodeKey) return;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.remove();
        }
      });
    },
    [editor],
  );

  const replacePreviewImage = useCallback(
    (
      nodeKey: NodeKey | null,
      uploaded: Awaited<ReturnType<ImageUploadHandler>>,
      fallbackAltText: string,
    ) => {
      if (!nodeKey) return;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isImageNode(node)) return;

        node.setImageData({
          src: uploaded.src,
          altText: uploaded.altText ?? fallbackAltText,
          width: uploaded.width ?? "inherit",
          height: uploaded.height ?? "inherit",
        });
      });
    },
    [editor],
  );

  const uploadFiles = useCallback(
    (files: File[], source: ImageUploadSource) => {
      if (files.length === 0) return;

      void (async () => {
        for (const file of files) {
          const { nodeKey, previewUrl } = insertPreviewImage(file);

          try {
            const uploaded = await onImageUpload(file, { source });
            replacePreviewImage(nodeKey, uploaded, file.name || "");
          } catch (error) {
            removePreviewImage(nodeKey);
            onImageUploadError?.(error);
          } finally {
            URL.revokeObjectURL(previewUrl);
          }
        }
      })();
    },
    [
      insertPreviewImage,
      onImageUpload,
      onImageUploadError,
      removePreviewImage,
      replacePreviewImage,
    ],
  );

  useEffect(() => {
    return editor.registerCommand(
      UPLOAD_IMAGE_FILES_COMMAND,
      ({ files, source = "file-dialog" }) => {
        uploadFiles(files, source);
        return files.length > 0;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, uploadFiles]);

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
