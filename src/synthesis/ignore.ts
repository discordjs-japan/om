export function ignoreParenContent(content: string) {
  let depth = 0;
  let result = "";

  for (const char of content) {
    if (char === "(" || char === "（") depth++;
    if (char === ")" || char === "）") depth--;
    if (depth < 0) depth = 0;
    if (depth === 0) result += char;
  }

  return result;
}
