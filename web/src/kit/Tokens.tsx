import type { CSSProperties, ReactNode } from "react";

import css from "../ui/tokens.css?raw";
import type { KitData } from "./kitData";

interface Token {
  readonly name: string;
  readonly value: string;
  /** Its value under reduced motion, where that differs. */
  readonly reduced: string | null;
}

/** A run of tokens with no blank line between them, and the comment over it. */
interface Group {
  readonly note: string | null;
  readonly tokens: readonly Token[];
}

/** The body of the first block opening with `opening`, without its braces. */
function blockAfter(source: string, opening: RegExp): string {
  const match = opening.exec(source);
  if (match === null) return "";
  const start = match.index + match[0].length;
  let depth = 1;
  for (let at = start; at < source.length; at++) {
    if (source[at] === "{") depth++;
    if (source[at] === "}" && --depth === 0) return source.slice(start, at);
  }
  return source.slice(start);
}

/** Declarations and comments in order, a blank line closing a group. */
function parse(body: string, reducedValues: ReadonlyMap<string, string>): Group[] {
  const groups: Group[] = [];
  let note: string | null = null;
  let tokens: Token[] = [];
  const close = () => {
    if (tokens.length > 0 || note !== null) groups.push({ note, tokens });
    note = null;
    tokens = [];
  };
  let at = 0;
  while (at < body.length) {
    const space = /^\s*/.exec(body.slice(at))?.[0] ?? "";
    if ((space.match(/\n/g)?.length ?? 0) > 1) close();
    at += space.length;
    if (at >= body.length) break;
    if (body.startsWith("/*", at)) {
      const end = body.indexOf("*/", at);
      const text = body.slice(at + 2, end).replace(/\s+/g, " ").trim();
      if (tokens.length > 0) close();
      note = note === null ? text : `${note} ${text}`;
      at = end + 2;
      continue;
    }
    let depth = 0;
    let end = at;
    for (; end < body.length; end++) {
      if (body[end] === "(") depth++;
      if (body[end] === ")") depth--;
      if (body[end] === ";" && depth === 0) break;
    }
    const declaration = body.slice(at, end);
    const colon = declaration.indexOf(":");
    const name = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).replace(/\s+/g, " ").trim();
    tokens.push({ name, value, reduced: reducedValues.get(name) ?? null });
    at = end + 1;
  }
  close();
  return groups;
}

function reduced(source: string): Map<string, string> {
  const media = blockAfter(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
  const root = blockAfter(media, /:root\s*\{/);
  return new Map(parse(root, new Map()).flatMap((group) => group.tokens.map((token) => [token.name, token.value])));
}

const GROUPS = parse(blockAfter(css, /^:root\s*\{/m), reduced(css));

type Kind = "colour" | "font" | "size" | "leading" | "tracking" | "length" | "shadow" | "pattern" | "time" | "other";

function kindOf({ name, value }: Token): Kind {
  if (/^(#|color-mix\(|rgb)/.test(value)) return "colour";
  if (/serif/.test(value)) return "font";
  if (name.startsWith("--type-")) return "size";
  if (name.startsWith("--leading")) return "leading";
  if (name.startsWith("--tracking")) return "tracking";
  if (/gradient\(/.test(value)) return "pattern";
  if (/(ms|cubic-bezier\(.*\))$/.test(value)) return "time";
  if (/(glow|shadow)/.test(name)) return "shadow";
  if (/^-?\d*\.?\d+px$/.test(value)) return "length";
  return "other";
}

/** How a token looks: the thing it sets, drawn with the token itself through `var()`. */
function Sample({ token, kit }: { readonly token: Token; readonly kit: KitData }) {
  const use = `var(${token.name})`;
  const { boss, characterClass } = kit.samples;
  const style = (properties: CSSProperties) => properties;
  switch (kindOf(token)) {
    case "colour":
      return <span className="kit-swatch" style={style({ background: use })} />;
    case "font":
      return (
        <span className="kit-sample" style={style({ fontFamily: use })}>
          {boss.name}
        </span>
      );
    case "size":
      return (
        <span className="kit-sample kit-sample-size" style={style({ fontSize: use })}>
          {token.name.replace("--type-", "")}
        </span>
      );
    case "leading":
      return (
        <span className="kit-sample kit-sample-leading" style={style({ lineHeight: use })}>
          {boss.name}, {boss.location}
        </span>
      );
    case "tracking":
      return (
        <span className="kit-sample kit-sample-tracking" style={style({ letterSpacing: use })}>
          {characterClass.name}
        </span>
      );
    case "length":
      return <span className="kit-bar" style={style({ width: use })} />;
    case "shadow":
      return <span className="kit-shadow" style={style({ boxShadow: use })} />;
    case "pattern":
      return <span className="kit-pattern" style={style({ backgroundImage: use })} />;
    case "time":
    case "other":
      return null;
  }
}

function TokenRow({ token, kit }: { readonly token: Token; readonly kit: KitData }) {
  return (
    <li className={`kit-token kit-token-${kindOf(token)}`}>
      <span className="kit-token-sample">
        <Sample token={token} kit={kit} />
      </span>
      <code className="kit-token-name">{token.name}</code>
      <code className="kit-token-value">
        {token.value}
        {token.reduced !== null && <span className="kit-token-reduced"> · reduced motion: {token.reduced}</span>}
      </code>
    </li>
  );
}

/** Every custom property in `tokens.css`, read from the file itself, in its groups and with its comments. */
export function Tokens({ kit }: { readonly kit: KitData }): ReactNode {
  return GROUPS.map((group, index) => (
    <div key={index} className="kit-token-group">
      {group.note !== null && <p className="kit-token-note">{group.note}</p>}
      <ul className="kit-tokens">
        {group.tokens.map((token) => (
          <TokenRow key={token.name} token={token} kit={kit} />
        ))}
      </ul>
    </div>
  ));
}
