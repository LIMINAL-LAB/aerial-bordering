import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./PageTransition.css";

// The site reads left-to-right in this order, so moving to a later page slides the
// content out to the left and brings the next page in from the right; going back
// reverses it.
const ROUTE_ORDER = ["/", "/report", "/database", "/methodology"];

// Each page paints its own ground over the black <body> (src/index.css:91). The
// transition's backdrop has to match, or the moment the content is transparent the reader
// sees straight through to that black. The home page is black by design
// (HomePage.css:6); everything else is the light grey the report and database share.
const PAGE_GROUND = {
  "/": "#000",
};
const DEFAULT_GROUND = "var(--grey-shade-1, #f2f2f2)";
const DARK_GROUND_ROUTES = ["/"];

const LEAVE_MS = 180;
const ENTER_MS = 240;

function getDirection(fromPathname, toPathname) {
  const fromIndex = ROUTE_ORDER.indexOf(fromPathname);
  const toIndex = ROUTE_ORDER.indexOf(toPathname);
  if (toIndex === -1 || toIndex > fromIndex) return "forward";
  return "backward";
}

function groundFor(pathname) {
  return PAGE_GROUND[pathname] || DEFAULT_GROUND;
}

// Crossfades the pages through their own ground colour while sliding them sideways,
// replacing both the fadeIn each page used to run on mount and the separate ScrollToTop
// component's scroll reset — folded in here so the reset lands at the moment the displayed
// route swaps rather than mid-slide.
//
// Two nested elements: an outer backdrop that never moves and never fades, painted the
// ground colour of whichever page is current, and an inner layer that carries the slide
// and the fade. Only the inner layer animates, so no part of the transition ever exposes
// the black <body>, and the nav bar — a sibling of this whole component — stays put
// throughout.
//
// Phase machine (one page mounted at a time; the report is far too heavy to mount twice):
//   idle -> leaving -> enter-start -> entering -> idle
// "leaving" animates the current page out to its ground. Once that finishes the route
// swaps and the inner layer snaps instantly ("enter-start", no transition) to the far
// offset, then once the new page has actually painted "entering" restores the transition
// and clears the offset, animating it home.
const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [phase, setPhase] = useState("idle");
  const [direction, setDirection] = useState("forward");
  const timeoutsRef = useRef([]);
  const rafsRef = useRef([]);
  // Scroll offset of each history entry the reader has left, keyed by location.key, so
  // Back/Forward returns to where they were rather than the top of the page.
  const savedScrollRef = useRef({});
  const pendingScrollRef = useRef(0);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (location.key !== displayLocation.key) {
      savedScrollRef.current[displayLocation.key] = window.scrollY;
    }
    pendingScrollRef.current =
      location.pathname !== displayLocation.pathname && !location.hash
        ? savedScrollRef.current[location.key] || 0
        : 0;
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      prefersReducedMotion ||
      location.pathname === displayLocation.pathname
    ) {
      // Hash-only or query-only change (e.g. a footnote jump), or a reader who has asked
      // for reduced motion: update the location the page renders against, but run no
      // slide. The scroll reset still has to happen on a real page change.
      if (location.pathname !== displayLocation.pathname && !location.hash) {
        // Explicitly instant: <html> carries scroll-behavior: smooth (src/index.css:95),
        // which a bare scrollTo(0, 0) obeys — the reset would otherwise animate all the
        // way up from wherever the reader was while the next page fades in over it.
        window.scrollTo({ top: pendingScrollRef.current, left: 0, behavior: "auto" });
      }
      setDisplayLocation(location);
      setPhase("idle");
      return undefined;
    }

    setDirection(getDirection(displayLocation.pathname, location.pathname));
    setPhase("leaving");

    const leaveTimer = setTimeout(() => {
      if (!location.hash) {
        // Explicitly instant: <html> carries scroll-behavior: smooth (src/index.css:95),
        // which a bare scrollTo(0, 0) obeys — the reset would otherwise animate all the
        // way up from wherever the reader was while the next page fades in over it.
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
      setDisplayLocation(location);
      setPhase("enter-start");

      // Two frames, not one. Mounting a page is expensive — the report especially — and
      // that work lands between the swap and the next paint. A single rAF fires before
      // the new page has been painted, so the fade-in runs against a blank frame and the
      // reader watches the ground colour instead. Waiting for the second frame starts the
      // fade on the first paint that actually has the new page in it.
      const outerRaf = requestAnimationFrame(() => {
        const innerRaf = requestAnimationFrame(() => {
          setPhase("entering");

          const enterTimer = setTimeout(() => setPhase("idle"), ENTER_MS);
          timeoutsRef.current.push(enterTimer);
        });
        rafsRef.current.push(innerRaf);
      });
      rafsRef.current.push(outerRaf);
    }, LEAVE_MS);
    timeoutsRef.current.push(leaveTimer);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      rafsRef.current.forEach(cancelAnimationFrame);
      rafsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Restore after the new page has mounted: the page is too short to scroll to the saved
  // offset until it has laid out.
  useLayoutEffect(() => {
    const top = pendingScrollRef.current;
    if (top > 0) {
      window.scrollTo({ top, left: 0, behavior: "auto" });
      pendingScrollRef.current = 0;
    }
  }, [displayLocation]);

  // Follow the ground colour all the way down to <body>, so nothing the reader can see
  // past the incoming page — below it before it has laid out, or in an overscroll bounce
  // — is the black default.
  useEffect(() => {
    document.body.dataset.ground = DARK_GROUND_ROUTES.includes(
      displayLocation.pathname
    )
      ? "dark"
      : "light";
  }, [displayLocation.pathname]);

  // The inner layer's transform makes it the containing block for every position: fixed
  // descendant, the report's sticky-titles overlay among them — and that overlay caches
  // its own `left` from a getBoundingClientRect reading taken on mount, i.e. while the
  // transform is still on. Measured against a translated ancestor it comes out displaced,
  // and nothing recomputes it until the next resize. Once the transform is gone, ask for
  // that recompute rather than leaving the overlay sitting wrong.
  useEffect(() => {
    if (phase !== "idle") return undefined;
    const raf = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, displayLocation.pathname]);

  const innerClass = ["page-transition-inner", direction];
  if (phase === "leaving") innerClass.push("is-leaving-animating", "is-leaving");
  if (phase === "enter-start") innerClass.push("is-entering");
  if (phase === "entering") innerClass.push("is-entering-animating");

  return (
    <div
      className="page-transition"
      style={{ background: groundFor(displayLocation.pathname) }}
    >
      <div className={innerClass.join(" ")}>{children(displayLocation)}</div>
    </div>
  );
};

export default PageTransition;
