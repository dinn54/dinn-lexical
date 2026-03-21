type MaybeLexicalRoot = {
  root?: {
    type?: string;
    children?: unknown[];
  };
};

export function parseLexicalEditorState(
  content?: string | null
): MaybeLexicalRoot | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) return null;

  try {
    const parsed = JSON.parse(trimmed) as MaybeLexicalRoot;
    if (
      parsed &&
      parsed.root &&
      parsed.root.type === "root" &&
      Array.isArray(parsed.root.children)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isLexicalEditorStateString(content?: string | null): boolean {
  return parseLexicalEditorState(content) !== null;
}

