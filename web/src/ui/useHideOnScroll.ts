import { useEffect, useRef, useState } from "react";

/** Whether a sticky header should hide: while the page scrolls down, and not once it scrolls up or reaches the
 * top, so what it holds is a short scroll away on a long page. A jump to an anchor keeps it hidden, so it never
 * covers the heading it landed on. */
export function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const jumping = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (jumping.current) {
        jumping.current = false;
        setHidden(y > 0);
      } else if (y <= 0) setHidden(false);
      else if (Math.abs(y - last.current) > 4) setHidden(y > last.current);
      last.current = y;
    };
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href^="#"]') !== null) jumping.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return hidden;
}
