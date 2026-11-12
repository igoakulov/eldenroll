// One character in, one out, so a match's position holds in the name as written
function fold(text: string): string {
  return [...text].map((char) => char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().charAt(0) || char).join("");
}

/** Where `query` first appears in `name`, ignoring case and accents, as `[start, end)`. */
export function findMatch(name: string, query: string): readonly [number, number] | null {
  const wanted = fold(query.trim());
  if (wanted === "") return null;
  const chars = [...name];
  const at = fold(name).indexOf(wanted);
  if (at < 0) return null;
  // Back from code points to UTF-16 offsets, which is what slicing the name uses
  const start = chars.slice(0, at).join("").length;
  return [start, start + chars.slice(at, at + [...wanted].length).join("").length];
}
