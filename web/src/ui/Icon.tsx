import "./Icon.css";

const files = import.meta.glob<string>("../assets/icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const icons = new Map(
  Object.entries(files).map(([path, svg]) => [path.slice(path.lastIndexOf("/") + 1, -".svg".length), svg]),
);

/** `name` is a file in `src/assets/icons/` without `.svg`; item icons come as `<key>`, `<key>-40`, `<key>-22`. */
export function Icon({ name, size }: { readonly name: string; readonly size: number }) {
  const svg = icons.get(name);
  if (svg === undefined) return null;
  return (
    <span
      className="icon-svg"
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** The lozenge beside an eyebrow and in the wordmark: our own glyph, never the game's. */
export function Lozenge({ size = 16 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M12 2.5l6.5 9.5-6.5 9.5L5.5 12z" />
      <path d="M12 7.6l3 4.4-3 4.4-3-4.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}
