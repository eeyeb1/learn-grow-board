import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/** Reset page position on navigation without moving the page for job-filter URL updates. */
const ScrollToNavigation = () => {
  const location = useLocation();
  const previous = useRef<{ pathname: string; search: string; hash: string } | null>(null);

  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    };

    if (location.hash) {
      const frame = requestAnimationFrame(() => {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
      });
      return () => cancelAnimationFrame(frame);
    }

    // Changing filters on the jobs page is not a page navigation.
    if (last?.pathname === "/jobs" && location.pathname === "/jobs" && last.search !== location.search) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.key, location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToNavigation;