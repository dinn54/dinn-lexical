import { createCommand, type LexicalCommand } from "lexical";

export type ImageUploadSource = "paste" | "drop" | "file-dialog";

export type ImageUploadContext = {
  source: ImageUploadSource;
};

export type UploadedImage = {
  src: string;
  altText?: string;
  width?: number | null;
  height?: number | null;
};

export type ImageUploadHandler = (
  file: File,
  context: ImageUploadContext,
) => Promise<UploadedImage>;

export type UploadImageFilesPayload = {
  files: File[];
  source?: ImageUploadSource;
};

export const UPLOAD_IMAGE_FILES_COMMAND: LexicalCommand<UploadImageFilesPayload> =
  createCommand("UPLOAD_IMAGE_FILES_COMMAND");

export function getImageFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];

  const files = Array.from(dataTransfer.files).filter((file) =>
    file.type.startsWith("image/"),
  );

  if (files.length > 0) return files;

  return Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}
