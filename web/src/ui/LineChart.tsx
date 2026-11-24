import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";

import "./LineChart.css";

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
}

/** What the readout under a chart says about one point: a title line over labelled values. */
export interface ChartReadout {
  readonly title: string;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
}

/** The chart draws at its box's own width, so its text and lines keep their size at any width; its height follows
 * at `ASPECT`, up to `MAX_HEIGHT`, so a wide chart doesn't tower. It measures before the first paint, so it never
 * shows at a guessed width. */
const FIRST_WIDTH = 320;
const ASPECT = 2.5;
const MAX_HEIGHT = 240;
const LEFT = 40;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 22;

/** One series as a gold line over a quiet grid, its title above; a `baseline`, such as the same series with one
 * effect removed, is drawn dashed beneath it at the same points, and a `secondary` series, such as the same value
 * over a wider count, solid in the baseline's colour. `marks` are moments on the line, such as each time
 * an item showed, drawn as small dots where the line passes them. `xRange` fixes the axis, so the line can start
 * part way along it. Under the chart, a readout describes the last point, or the one nearest the pointer, marked
 * with a rule and a dot. Marks past the last point sit on it. */
export function LineChart({
  title,
  points,
  baseline,
  secondary,
  marks,
  xRange,
  yMax,
  formatY,
  formatX,
  describe,
}: {
  readonly title: string;
  readonly points: readonly ChartPoint[];
  readonly baseline?: readonly ChartPoint[];
  readonly secondary?: readonly ChartPoint[];
  /** x values; each sits on the line, between its points. */
  readonly marks?: readonly number[];
  readonly xRange?: readonly [number, number];
  readonly yMax: number;
  readonly formatY: (value: number) => string;
  readonly formatX: (value: number) => string;
  /** The readout for a point, by its index. */
  readonly describe: (index: number) => ChartReadout;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const figure = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(FIRST_WIDTH);
  const height = Math.min(MAX_HEIGHT, Math.round(width / ASPECT));
  useLayoutEffect(() => {
    const element = figure.current;
    if (element === null) return;
    if (element.clientWidth > 0) setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      const measured = Math.round(entry?.contentRect.width ?? 0);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const xs = points.map((point) => point.x);
  const xMin = xRange?.[0] ?? Math.min(...xs);
  const xMax = xRange?.[1] ?? Math.max(...xs);
  const lineEnd = Math.max(...xs);
  const plotX = (x: number) => LEFT + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (width - LEFT - RIGHT));
  const plotY = (y: number) => TOP + (1 - (yMax > 0 ? Math.min(1, y / yMax) : 0)) * (height - TOP - BOTTOM);
  const line = (series: readonly ChartPoint[]) =>
    series.map((point, index) => `${index === 0 ? "M" : "L"}${plotX(point.x)},${plotY(point.y)}`).join(" ");
  const ticks = [0, yMax / 2, yMax];
  // The line's height at `x`, between the points either side of it
  const yAt = (x: number) => {
    const after = points.findIndex((point) => point.x >= x);
    if (after <= 0) return points[after === 0 ? 0 : points.length - 1]?.y ?? 0;
    const a = points[after - 1]!;
    const b = points[after]!;
    return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  };

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * width;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(plotX(point.x) - x) < Math.abs(plotX(points[nearest]!.x) - x)) nearest = index;
    });
    setHover(points.length === 0 ? null : nearest);
  };
  // A pointer left resting on the chart while its data changes can name a point that no longer exists
  const picked = hover === null || points.length === 0 ? null : Math.min(hover, points.length - 1);
  const shown = picked === null ? undefined : points[picked];
  const readout = points.length === 0 ? null : describe(picked ?? points.length - 1);

  return (
    <figure className="line-chart" ref={figure}>
      <figcaption className="line-chart-title">{title}</figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
        onPointerMove={onPointer}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="line-chart-grid" x1={LEFT} x2={width - RIGHT} y1={plotY(tick)} y2={plotY(tick)} />
            <text className="line-chart-axis" x={LEFT - 6} y={plotY(tick)} textAnchor="end" dominantBaseline="middle">
              {formatY(tick)}
            </text>
          </g>
        ))}
        {points.length > 0 && (
          <>
            <text className="line-chart-axis" x={LEFT} y={height - 4} textAnchor="start">
              {formatX(xMin)}
            </text>
            <text className="line-chart-axis" x={width - RIGHT} y={height - 4} textAnchor="end">
              {formatX(xMax)}
            </text>
          </>
        )}
        {baseline !== undefined && <path className="line-chart-baseline" d={line(baseline)} />}
        {secondary !== undefined && <path className="line-chart-secondary" d={line(secondary)} />}
        <path className="line-chart-line" d={line(points)} />
        {[...new Set((marks ?? []).filter((x) => x >= (points[0]?.x ?? Infinity)).map((x) => Math.min(x, lineEnd)))]
          .map((x) => (
            <circle key={x} className="line-chart-mark" cx={plotX(x)} cy={plotY(yAt(x))} r={2.5} />
          ))}
        {shown !== undefined && (
          <>
            <line className="line-chart-rule" x1={plotX(shown.x)} x2={plotX(shown.x)} y1={TOP} y2={height - BOTTOM} />
            <circle className="line-chart-dot" cx={plotX(shown.x)} cy={plotY(shown.y)} r={4} />
          </>
        )}
      </svg>
      {readout !== null && (
        <div className="line-chart-readout">
          <p className="line-chart-readout-title">{readout.title}</p>
          <dl>
            {readout.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </figure>
  );
}
