export function preprocessMarkdown(markdown: string): string {
  if (!markdown) return "";

  const processed = markdown
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\`/g, "`")
    .replace(/\\\\/g, "\\")
    .replace(/\\t/g, "\t");

  const codeBlockRegex = /```(\w*)(?:[^\n]*)\n([\s\S]*?)```/g;
  const replacements: { start: number; end: number; replacement: string }[] =
    [];
  let match;

  while ((match = codeBlockRegex.exec(processed)) !== null) {
    const [fullMatch, lang, content] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    const lines = content.split("\n");
    let startIdx = 0;
    let endIdx = lines.length;

    while (startIdx < endIdx && lines[startIdx].trim() === "") startIdx++;
    while (endIdx > startIdx && lines[endIdx - 1].trim() === "") endIdx--;

    const activeLines = lines.slice(startIdx, endIdx);

    if (activeLines.length === 0) {
      replacements.push({
        start: startIndex,
        end: endIndex,
        replacement: `\`\`\`${lang}\n\`\`\``,
      });
      continue;
    }

    let minIndent = Infinity;
    for (const line of activeLines) {
      const expandedLine = line.replace(/\t/g, "  ");
      const m = expandedLine.match(/^\s*/);
      const indent = m ? m[0].length : 0;
      if (indent < minIndent) minIndent = indent;
    }
    if (minIndent === Infinity) minIndent = 0;

    const dedented = activeLines
      .map((line) => {
        const expandedLine = line.replace(/\t/g, "  ");
        return expandedLine.length >= minIndent
          ? expandedLine.slice(minIndent)
          : expandedLine;
      })
      .join("\n");

    replacements.push({
      start: startIndex,
      end: endIndex,
      replacement: `\`\`\`${lang}\n${dedented}\n\`\`\``,
    });
  }

  let finalStr = processed;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i];
    finalStr = finalStr.slice(0, start) + replacement + finalStr.slice(end);
  }

  return expandReferenceStyleImages(finalStr);
}

function expandReferenceStyleImages(markdown: string): string {
  const referenceDefinitions = new Map<string, { url: string; title?: string }>();
  const referenceDefinitionRegex =
    /^\[([^\]\^]+)\]:\s+(\S+?)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]+)\)))?\s*$/gm;

  let definitionMatch: RegExpExecArray | null;
  while ((definitionMatch = referenceDefinitionRegex.exec(markdown)) !== null) {
    const [, rawId, url, doubleQuotedTitle, singleQuotedTitle, parenthesizedTitle] =
      definitionMatch;
    referenceDefinitions.set(rawId.trim().toLowerCase(), {
      url,
      title: doubleQuotedTitle || singleQuotedTitle || parenthesizedTitle || undefined,
    });
  }

  if (referenceDefinitions.size === 0) {
    return markdown;
  }

  const usedReferenceIds = new Set<string>();
  const expanded = markdown.replace(/!\[([^\]]*)\]\[([^\]]+)\]/g, (fullMatch, alt, rawId) => {
    const normalizedId = String(rawId).trim().toLowerCase();
    const definition = referenceDefinitions.get(normalizedId);
    if (!definition) {
      return fullMatch;
    }

    usedReferenceIds.add(normalizedId);
    const titleSuffix = definition.title ? ` "${definition.title}"` : "";
    return `![${alt}](${definition.url}${titleSuffix})`;
  });

  if (usedReferenceIds.size === 0) {
    return expanded;
  }

  return expanded.replace(referenceDefinitionRegex, (fullMatch, rawId) => {
    const normalizedId = String(rawId).trim().toLowerCase();
    return usedReferenceIds.has(normalizedId) ? "" : fullMatch;
  });
}
