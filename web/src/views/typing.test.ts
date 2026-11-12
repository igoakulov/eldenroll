import { describe, expect, it } from "vitest";

import {
  FIRST_TYPING,
  TAGLINE_LINK,
  TAGLINES,
  holdMs,
  keyDelay,
  lineBreak,
  nextTyping,
  readMs,
  splitTyped,
  wordBefore,
  type Typing,
} from "./typing";

describe("Start's tagline", () => {
  it("links Elden Rold exactly once in every variant", () => {
    for (const tagline of TAGLINES) {
      expect(tagline.split(TAGLINE_LINK)).toHaveLength(2);
    }
  });

  it("types each variant in full, holds it, deletes it a word at a time, then types the next and loops", () => {
    const texts = ["a b", "cd"];
    const seen: Typing[] = [];
    let state = FIRST_TYPING;
    for (let step = 0; step < 14; step += 1) {
      state = nextTyping(state, texts);
      seen.push(state);
    }
    const shown = seen.map((s) => `${s.variant}:${s.shown}:${s.phase}`);
    expect(shown.slice(0, 9)).toEqual([
      "0:1:typing",
      "0:2:typing",
      "0:3:holding",
      "0:3:deleting",
      "0:2:deleting",
      "0:0:pausing",
      "1:0:typing",
      "1:1:typing",
      "1:2:holding",
    ]);
    expect(shown.at(-1)?.startsWith("0:")).toBe(true);
  });

  it("deletes Elden Rold in one go", () => {
    const text = "Follow fate to become Elden Rold.";
    expect(wordBefore(text, text.length)).toBe("Follow fate to become ".length);
    expect(wordBefore(text, "Follow fate to become ".length)).toBe("Follow fate to ".length);
  });

  it("pauses between words, and longer after punctuation", () => {
    const letter = keyDelay("o", 0.5);
    expect(keyDelay(" ", 0.5)).toBeGreaterThan(letter);
    expect(keyDelay(",", 0.5)).toBeGreaterThan(keyDelay(" ", 0.5));
    expect(keyDelay(".", 0.5)).toBeGreaterThan(keyDelay(",", 0.5));
    expect(keyDelay("o", 0)).toBeLessThan(keyDelay("o", 0.99));
  });

  it("holds a longer line longer, but for less than reading it all takes", () => {
    expect(holdMs("A longer line to read")).toBeGreaterThan(holdMs("A line"));
    for (const tagline of TAGLINES) expect(holdMs(tagline)).toBeLessThan(readMs(tagline));
  });

  it("breaks the first line at the last space that fits, never inside the link", () => {
    const text = "Roll objectives to become Elden Rold.";
    const upTo = (length: number) => (line: string) => line.length <= length;
    expect(lineBreak(text, upTo(100))).toBeNull();
    expect(lineBreak(text, upTo(20))).toBe("Roll objectives to ".length);
    expect(lineBreak(text, upTo(31))).toBe("Roll objectives to become ".length);
  });

  it("keeps the link whole as one piece while it types", () => {
    const text = "Follow fate to become Elden Rold.";
    expect(splitTyped(text, 25)).toEqual({
      before: { typed: "Follow fate to become ", rest: "" },
      link: { typed: "Eld", rest: "en Rold" },
      after: { typed: "", rest: "." },
    });
  });
});
