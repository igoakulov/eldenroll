import { copy } from "../copy";
import "./AppIcon.css";

/** The app's own icon as the Home Screen shows it, its name under it. Drawn as a background, so Safari's Reader, which
 * keeps a page's images, leaves it out. */
export function AppIcon() {
  return (
    <span className="app-icon">
      <span className="app-icon-image" aria-hidden="true" />
      <span className="app-icon-name">{copy.common.appName}</span>
    </span>
  );
}
