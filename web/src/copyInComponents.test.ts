import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SyntaxKind, type Expression, type Node, type SourceFile } from "typescript/unstable/ast";
import {
  isArrayLiteralExpression,
  isBinaryExpression,
  isConditionalExpression,
  isIdentifier,
  isJsxAttribute,
  isJsxElement,
  isJsxExpression,
  isJsxFragment,
  isJsxText,
  isNoSubstitutionTemplateLiteral,
  isParenthesizedExpression,
  isStringLiteral,
  isTemplateExpression,
} from "typescript/unstable/ast/is";
import { API } from "typescript/unstable/sync";
import { afterAll, describe, expect, it } from "vitest";

// Every word the UI shows is in `src/copy.ts`. This fails on words written straight into a component:
// JSX text, and literals in the props that hold text. Punctuation and symbols such as `?` or `−` may stay. A literal
// that must stay says why in a `not copy: <reason>` comment on its line or the line before.

const SRC = fileURLToPath(new URL(".", import.meta.url));

// Props that hold text, besides any named `…label` or `…text`
const TEXT_PROPS = new Set(["alt", "placeholder", "title", "aria-label", "aria-valuetext", "aria-description", "eyebrow",
  "lede", "detail", "question", "action", "notice", "notFound", "tag", "bossName", "ends"]);

function isTextProp(node: Node | undefined): boolean {
  if (node === undefined || !isJsxAttribute(node) || !isIdentifier(node.name)) return false;
  return TEXT_PROPS.has(node.name.text) || /(?:^l|L)abel$|(?:^t|T)ext$/.test(node.name.text);
}
const WORDS = /\p{L}/u;

/** The literal parts of `expression` that end up as text: both branches of `?:`, the right of `&&`, and so on, but
 * not a comparison's operands or a call's arguments. */
function spokenParts(expression: Expression): { readonly node: Node; readonly text: string }[] {
  if (isStringLiteral(expression) || isNoSubstitutionTemplateLiteral(expression)) {
    return [{ node: expression, text: expression.text }];
  }
  if (isTemplateExpression(expression)) {
    const text = [expression.head.text, ...expression.templateSpans.map((span) => span.literal.text)].join(" ");
    return [{ node: expression, text }];
  }
  if (isConditionalExpression(expression)) {
    return [...spokenParts(expression.whenTrue), ...spokenParts(expression.whenFalse)];
  }
  if (isParenthesizedExpression(expression)) return spokenParts(expression.expression);
  if (isArrayLiteralExpression(expression)) return expression.elements.flatMap(spokenParts);
  if (isBinaryExpression(expression)) {
    const operator = expression.operatorToken.kind;
    if (operator === SyntaxKind.AmpersandAmpersandToken) return spokenParts(expression.right);
    if (
      operator === SyntaxKind.BarBarToken ||
      operator === SyntaxKind.QuestionQuestionToken ||
      operator === SyntaxKind.PlusToken
    ) {
      return [...spokenParts(expression.left), ...spokenParts(expression.right)];
    }
  }
  return [];
}

/** Every piece of UI text written into `file`, as `path:line: "text"`. */
function wordsIn(file: SourceFile, relative: string): string[] {
  const lines = file.text.split("\n");
  const found: string[] = [];
  const report = (node: Node, text: string) => {
    if (!WORDS.test(text)) return;
    const start = node.getStart(file) + (isJsxText(node) ? text.length - text.trimStart().length : 0);
    const line = file.getLineAndCharacterOfPosition(start).line;
    if ([lines[line], lines[line - 1]].some((one) => one?.includes("not copy:"))) return;
    found.push(`${relative}:${line + 1}: ${JSON.stringify(text.trim().replace(/\s+/g, " "))}`);
  };
  const visit = (node: Node): void => {
    const parent = node.parent as Node | undefined;
    if (isJsxText(node)) report(node, node.text);
    if (isStringLiteral(node) && isTextProp(parent)) report(node, node.text);
    if (isJsxExpression(node) && node.expression !== undefined) {
      const child = parent !== undefined && (isJsxElement(parent) || isJsxFragment(parent));
      if (child || isTextProp(parent)) for (const part of spokenParts(node.expression)) report(part.node, part.text);
    }
    node.forEachChild(visit);
  };
  visit(file);
  return found;
}

const api = new API({ cwd: SRC });
const scratch: string[] = [];
afterAll(() => {
  api.close();
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** The parsed files of the project whose `tsconfig.json` is `config`. */
function project(config: string) {
  const found = api.updateSnapshot({ openProject: config }).getProject(config);
  if (found === undefined) throw new Error(`No project for ${config}`);
  return found.program;
}

/** A component file written to a scratch project, as `wordsIn` reads it. */
function wordsInSource(source: string): string[] {
  const dir = mkdtempSync(path.join(tmpdir(), "copy-test-"));
  scratch.push(dir);
  writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { jsx: "preserve" } }));
  writeFileSync(path.join(dir, "Fixture.tsx"), source);
  const file = project(path.join(dir, "tsconfig.json")).getSourceFile(path.join(dir, "Fixture.tsx"));
  if (file === undefined) throw new Error("The fixture did not parse");
  return wordsIn(file, "Fixture.tsx");
}

describe("UI copy", () => {
  it("lives in copy.ts, never in a component", () => {
    const program = project(path.join(SRC, "..", "tsconfig.json"));
    const files = readdirSync(SRC, { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".tsx") && !name.endsWith(".kit.tsx") && !name.endsWith(".test.tsx"))
      .filter((name) => !name.startsWith(`kit${path.sep}`));
    expect(files.length).toBeGreaterThan(0);
    const found = files.flatMap((name) => {
      const file = program.getSourceFile(path.join(SRC, name));
      if (file === undefined) throw new Error(`${name} is not in the project`);
      return wordsIn(file, name);
    });
    expect(found).toEqual([]);
  });

  it("is caught when written into a component", () => {
    const found = wordsInSource(
      [
        "export const A = (n: number, on: boolean) => (",
        '  <p title="Help" aria-label={`Lower ${n}`} className="not-text" label={on ? "Yes" : "No"} ends={["Start", "End"]}>',
        "    Great enemy",
        '    {on && "felled"}',
        '    {n === 1 ? "one" : `${n} more`}',
        "  </p>",
        ");",
      ].join("\n"),
    );
    expect(found).toEqual([
      'Fixture.tsx:2: "Help"',
      'Fixture.tsx:2: "Lower"',
      'Fixture.tsx:2: "Yes"',
      'Fixture.tsx:2: "No"',
      'Fixture.tsx:2: "Start"',
      'Fixture.tsx:2: "End"',
      'Fixture.tsx:3: "Great enemy"',
      'Fixture.tsx:4: "felled"',
      'Fixture.tsx:5: "one"',
      'Fixture.tsx:5: "more"',
    ]);
  });

  it("lets symbols, punctuation, logic and marked literals stay", () => {
    const found = wordsInSource(
      [
        'export const A = (n: number, kind: string, f: (s: string) => string) => (',
        '  <p aria-hidden="true" className={kind === "red" ? "x" : "y"} aria-label={`${kind}: ${n}`}>',
        '    ? − + → · {" "}',
        '    {kind === "skipped" ? n : f("before")}',
        "    {/* not copy: a drawn wordmark */}",
        "    <span>ELDEN</span>",
        "  </p>",
        ");",
      ].join("\n"),
    );
    expect(found).toEqual([]);
  });
});
