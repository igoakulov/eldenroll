import type { KitBlock } from "../kit/kit";
import { Icon, Lozenge, WordmarkO } from "./Icon";

const files = Object.keys(import.meta.glob(["../assets/icons/*.svg", "../assets/marks/*.svg"]));
const names = new Set(files.map((path) => path.slice(path.lastIndexOf("/") + 1, -".svg".length)));
/** Each icon by its key, at every size it is drawn at. */
const ICONS = [...names]
  .filter((name) => !/-(40|22)$/.test(name))
  .sort()
  .map((name) => ({
    name,
    sizes: [
      { file: name, size: 40 },
      ...(names.has(`${name}-40`) ? [{ file: `${name}-40`, size: 38 }] : []),
      ...(names.has(`${name}-22`) ? [{ file: `${name}-22`, size: 22 }] : []),
    ],
  }));

export const kit: readonly KitBlock[] = [
  {
    id: "icon",
    title: "Icons",
    section: "controls",
    size: "small",
    states: [
      { label: "lozenge", render: () => <span className="kit-glyph"><Lozenge /></span> },
      { label: "wordmark O", render: () => <span className="kit-glyph kit-glyph-large"><WordmarkO className="kit-wordmark-o" /></span> },
      {
        label: "every icon, at the sizes it is drawn",
        size: "wide",
        render: () => (
          <ul className="kit-icons">
            {ICONS.map((icon) => (
              <li key={icon.name}>
                <span className="kit-icon-sizes">
                  {icon.sizes.map((size) => (
                    <Icon key={size.file} name={size.file} size={size.size} />
                  ))}
                </span>
                <code>{icon.name}</code>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },
];
