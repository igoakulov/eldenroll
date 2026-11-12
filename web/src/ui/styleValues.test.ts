import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// web/src/ui/README.md#UI kit: every style value in CSS comes from a scale in tokens.css. A declaration that must
// keep a raw value says why in a `/* raw: <reason> */` comment on one of its lines.

const SRC = fileURLToPath(new URL("..", import.meta.url));
const TOKENS = path.join(SRC, "ui", "tokens.css");

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i;
const DURATION = /(?<![\w.-])(\d*\.?\d+)m?s\b/g;
const TYPE = /^(?:font-size|line-height|letter-spacing)$/;
const SPACING = /^(?:gap|row-gap|column-gap|padding|margin)(?:-[a-z-]+)?$/;
const SHADOW = /^(?:text-shadow|box-shadow)$/;
const PX = /(?<![\w.-])(\d*\.?\d+)px\b/g;

/** `value` without its `var(…)` and `env(…)` calls, nested ones included. */
function withoutReferences(value: string): string {
  let out = value;
  for (;;) {
    const start = out.search(/\b(?:var|env)\(/);
    if (start < 0) return out;
    let depth = 0;
    let end = out.indexOf("(", start);
    for (; end < out.length; end++) {
      if (out[end] === "(") depth++;
      if (out[end] === ")" && --depth === 0) break;
    }
    out = `${out.slice(0, start)}${out.slice(end + 1)}`;
  }
}

function nonZero(value: string, pattern: RegExp): boolean {
  return [...value.matchAll(pattern)].some((match) => Number(match[1]) !== 0);
}

function problem(property: string, value: string): string | null {
  if (COLOUR.test(value)) return "a literal colour";
  if (nonZero(value, DURATION)) return "a literal duration";
  const bare = withoutReferences(value);
  if (TYPE.test(property) && /\d/.test(bare)) return "a literal size";
  if (SPACING.test(property) && nonZero(bare, PX)) return "a px value";
  if (SHADOW.test(property) && !/^[\s,]*(?:none)?[\s,]*$/.test(bare)) return "a literal shadow";
  if (property === "filter" && /drop-shadow\((?!var\([^()]*\)\))/.test(value)) return "a literal shadow";
  return null;
}

function problemsIn(file: string): string[] {
  const css = readFileSync(file, "utf8");
  const lineOf = (index: number) => css.slice(0, index).split("\n").length;
  const raw = new Set<number>();
  // Comments become spaces, so positions and line numbers stay where they were
  const code = css.replace(/\/\*[\s\S]*?\*\//g, (comment, index: number) => {
    if (/^\/\*\s*raw:\s*\S/.test(comment)) raw.add(lineOf(index));
    return comment.replace(/[^\n]/g, " ");
  });
  const found: string[] = [];
  for (const match of code.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/gi)) {
    const [whole, property = "", value = ""] = match;
    const first = lineOf(match.index);
    const last = first + whole.split("\n").length - 1;
    const what = problem(property.toLowerCase(), value);
    const exempt = Array.from({ length: last - first + 1 }, (_, i) => first + i).some((line) => raw.has(line));
    if (what !== null && !exempt) found.push(`${path.relative(SRC, file)}:${first}: ${property} has ${what}`);
  }
  return found;
}

describe("style values", () => {
  it("come from tokens.css in every other CSS file", () => {
    const files = readdirSync(SRC, { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".css"))
      .map((name) => path.join(SRC, name))
      .filter((file) => file !== TOKENS);
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap(problemsIn)).toEqual([]);
  });

  it("are caught when raw", () => {
    expect(problem("color", "#e3cf98")).not.toBeNull();
    expect(problem("background", "linear-gradient(rgba(0, 0, 0, 0.5), transparent)")).not.toBeNull();
    expect(problem("animation", "fade-in 400ms var(--ease-out)")).not.toBeNull();
    expect(problem("font-size", "18.5px")).not.toBeNull();
    expect(problem("line-height", "1.4")).not.toBeNull();
    expect(problem("margin", "0 var(--gutter) 14px")).not.toBeNull();
    expect(problem("box-shadow", "0 0 8px var(--grace-mid)")).not.toBeNull();
    expect(problem("filter", "drop-shadow(0 0 8px var(--grace))")).not.toBeNull();
    expect(problem("padding", "max(var(--space-7), calc(env(safe-area-inset-bottom, 0px) + var(--space-4)))")).toBeNull();
    expect(problem("transition-duration", "0ms")).toBeNull();
    expect(problem("filter", "drop-shadow(var(--glow-small))")).toBeNull();
  });
});
