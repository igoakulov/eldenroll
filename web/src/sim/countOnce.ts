/** Counts kept per sample, so a tab drawn again reads them rather than counting the runs again; a sample lasts as
 * long as its runs and picked classes, and its counts go with it. */
const counted = new WeakMap<object, Map<string, unknown>>();

export function countOnce<T>(sample: object, key: string, count: () => T): T {
  let own = counted.get(sample);
  if (own === undefined) {
    own = new Map();
    counted.set(sample, own);
  }
  if (!own.has(key)) own.set(key, count());
  return own.get(key) as T;
}
