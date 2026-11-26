import { copy } from "../copy";

export const TAGLINES: readonly string[] = copy.start.taglines;

export const TAGLINE_LINK: string = copy.start.taglineLink;

/** A person's rhythm rather than a constant beat, but flowing: keys vary a little, a word's first letter comes a
 * touch slower, and a space or punctuation adds a short breath rather than a stop. Deleting goes a word at a
 * time, as a person holding Option-Backspace would. */
const TYPE_MS = 34;
const JITTER = 0.12;
const WORD_START = 1.35;
const WORD_PAUSE_MS = 30;
const COMMA_PAUSE_MS = 95;
const STOP_PAUSE_MS = 140;
const DELETE_WORD_MS = 45;
const PAUSE_MS = 450;

/** The wait after typing `typed`, the character just shown, before `next`; `random` is in [0, 1). */
export function keyDelay(typed: string, random: number, next = ""): number {
  const start = typed === " " && next !== "" ? WORD_START : 1;
  const key = TYPE_MS * start * (1 - JITTER + 2 * JITTER * random);
  if (typed === " ") return key + WORD_PAUSE_MS;
  if (typed === "," || typed === ";") return key + COMMA_PAUSE_MS;
  if (typed === "." || typed === "!" || typed === "?") return key + STOP_PAUSE_MS;
  return key;
}

/** About 200 words a minute, and a beat to take the line in at the end. */
const READ_MS = 60;
const READ_BEAT_MS = 900;

export function readMs(text: string): number {
  return READ_BEAT_MS + READ_MS * text.length;
}

/** A typed line stays for a fixed beat, to take in that it is whole, plus a share of the time reading its words
 * takes, so a longer line stays longer: the reader has followed most of it as it typed, but may have started
 * late. */
const HOLD_BEAT_MS = 1500;
const HOLD_SHARE = 0.4;

export function holdMs(text: string): number {
  return HOLD_BEAT_MS + HOLD_SHARE * READ_MS * text.length;
}

export interface Typing {
  readonly variant: number;
  readonly shown: number;
  readonly phase: "typing" | "holding" | "deleting" | "pausing";
}

export const FIRST_TYPING: Typing = { variant: 0, shown: 0, phase: "typing" };

/** How long the tagline stays in this state before `nextTyping`. */
export function typingDelay(state: Typing, texts: readonly string[], random: number): number {
  const text = texts[state.variant] ?? "";
  switch (state.phase) {
    case "typing":
      return keyDelay(text.charAt(state.shown - 1), random, text.charAt(state.shown));
    case "holding":
      return holdMs(text);
    case "deleting":
      return DELETE_WORD_MS;
    case "pausing":
      return PAUSE_MS;
  }
}

/** Where deleting the word before `shown` leaves the line: back over spaces, then over the word, with
 * `Elden Rold` going as one piece. */
export function wordBefore(text: string, shown: number): number {
  let index = shown;
  while (index > 0 && text.charAt(index - 1) === " ") index -= 1;
  while (index > 0 && text.charAt(index - 1) !== " ") index -= 1;
  const start = text.indexOf(TAGLINE_LINK);
  return start !== -1 && index > start && index < start + TAGLINE_LINK.length ? start : index;
}

export function nextTyping(state: Typing, texts: readonly string[]): Typing {
  const text = texts[state.variant] ?? "";
  const length = text.length;
  switch (state.phase) {
    case "typing": {
      const shown = Math.min(length, state.shown + 1);
      return { ...state, shown, phase: shown === length ? "holding" : "typing" };
    }
    case "holding":
      return { ...state, phase: "deleting" };
    case "deleting": {
      const shown = wordBefore(text, state.shown);
      return { ...state, shown, phase: shown === 0 ? "pausing" : "deleting" };
    }
    case "pausing":
      return { variant: (state.variant + 1) % texts.length, shown: 0, phase: "typing" };
  }
}

export interface TypedPart {
  readonly typed: string;
  /** Not typed yet: laid out but invisible, so the typed text never rewraps or shifts. */
  readonly rest: string;
}

/** The characters from `from` to `to` split around the link, so the link stays one piece while it types. */
export function splitTyped(
  text: string,
  shown: number,
  from = 0,
  to = text.length,
): { before: TypedPart; link: TypedPart; after: TypedPart } {
  const start = text.indexOf(TAGLINE_LINK);
  const end = start + TAGLINE_LINK.length;
  const part = (a: number, b: number): TypedPart => {
    const low = Math.max(a, from);
    const high = Math.min(b, to);
    if (low >= high) return { typed: "", rest: "" };
    const cut = Math.min(Math.max(shown, low), high);
    return { typed: text.slice(low, cut), rest: text.slice(cut, high) };
  };
  return { before: part(0, start), link: part(start, end), after: part(end, text.length) };
}

/** Where the second line starts: after the last space at which the line so far fits `fits`, never inside the
 * link; `null` when the whole line fits. */
export function lineBreak(text: string, fits: (line: string) => boolean): number | null {
  if (fits(text)) return null;
  const start = text.indexOf(TAGLINE_LINK);
  const end = start + TAGLINE_LINK.length;
  let best: number | null = null;
  for (let index = text.indexOf(" "); index !== -1; index = text.indexOf(" ", index + 1)) {
    if (index > start && index < end) continue;
    if (!fits(text.slice(0, index))) break;
    best = index + 1;
  }
  return best;
}
