export function isRenderableImageSrc(src: string | null | undefined): src is string {
  if (!src) return false;

  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return true;
  }

  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
