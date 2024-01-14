export function ignoreParenContent(content: string) {
  let depth = 0;
  let result = "";

  for (const char of content) {
    if (char === "(" || char === "（") depth++;
    if (depth === 0) result += char;
    if (char === ")" || char === "）") depth--;
    if (depth < 0) depth = 0;
  }

  return result;
}
