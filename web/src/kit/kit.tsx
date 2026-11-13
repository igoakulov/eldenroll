import { useState, type ComponentType, type ReactNode } from "react";

import type { KitData } from "./kitData";
import { VIEW_PARAM, type ViewName } from "./viewNames";

/** One state of a component, drawn with fixed props and real data. */
export interface KitState {
  readonly label: string;
  readonly render: (kit: KitData) => ReactNode;
  /** Wider than the block's other cells, as a list of every icon is. */
  readonly size?: KitBlock["size"];
}

export interface KitProps {
  readonly kit: KitData;
}

/** One block of the kit page: a component's states beside one live instance to tap. Each `<Name>.kit.tsx` in
 * `src/ui/` exports its blocks as `kit` (web/src/ui/README.md#UI kit). */
export interface KitBlock {
  /** The block's anchor, as in `/kit/#chip`. */
  readonly id: string;
  readonly title: string;
  /** `simulation`: built for the simulation page alone, which the app never shows. */
  readonly section: "controls" | "groups" | "simulation";
  /** `phone` cells are a phone's width, for what spans the screen; `small` ones fit what they hold; `wide` ones
   * take the page's width. */
  readonly size: "small" | "phone" | "wide";
  readonly states: readonly KitState[];
  readonly Live?: ComponentType<KitProps>;
  /** The live cell's size, where it needs more room than the states. */
  readonly liveSize?: KitBlock["size"];
  /** What the states can't show, such as a press, said in a line under them. */
  readonly note?: string;
}

/** A screen-sized box that scrolls, as a phone's screen does, so bottom bars and sheets stick to its bottom. */
export function KitScreen({ short = false, children }: { readonly short?: boolean; readonly children: ReactNode }) {
  return <div className={`kit-screen${short ? " kit-screen-short" : ""}`}>{children}</div>;
}

/** One view alone in its own page, as the screenshots capture it, drawn and never focused: a sheet in it holds
 * the keyboard, which on this page would trap `Tab` for everything else. */
export function KitFrame({ view, title }: { readonly view: ViewName; readonly title: string }) {
  return <iframe className="kit-frame" src={`?${VIEW_PARAM}=${view}`} title={title} loading="lazy" inert />;
}

/** Content that sits inside a sheet or a screen's gutter in the app, given the same margin. */
export function KitPad({ children }: { readonly children: ReactNode }) {
  return <div className="kit-pad">{children}</div>;
}

/** Remounts its children when `onDone` is called, so a control that ends, such as a countdown, starts again. */
export function Restarting({ children }: { readonly children: (restart: () => void) => ReactNode }) {
  const [round, setRound] = useState(0);
  return <div key={round}>{children(() => setRound((last) => last + 1))}</div>;
}
