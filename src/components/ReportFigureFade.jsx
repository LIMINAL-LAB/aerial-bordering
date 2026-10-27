import { useCallback, useEffect, useRef, useState } from "react";

// Scroll-scrubbed crossfade between two states of the same map, used by the chapter 1
// naval-operation figures: the figure pins to the viewport and the reader's scroll drives
// the earlier operation's map into the one the caption names. Reversible — scrolling back
// up runs the fade backwards — because opacity is read from scroll position every frame
// rather than fired once on an intersection.
//
// The fade is held at each end for HOLD of the runway so the reader sees the before and
// after states settled, rather than the figure arriving mid-dissolve.
const HOLD = 0.15;
// How much of the runway the scrim below the figure takes to reach full strength. Short,
// so the text under the figure is already veiled by the time the map starts dissolving.
const SCRIM_IN = 0.08;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

const REST = { progress: 0, scrim: 0, scrimTop: 0 };

const ReportFigureFade = ({
  from,
  to,
  alt,
  children,
  onActivate,
  scrollRootRef,
  scrollOffset,
}) => {
  // `from` is one earlier state or an ordered list of them; the figure steps through
  // each in turn, landing on `to`.
  const earlier = Array.isArray(from) ? from : [from];
  const steps = earlier.length;
  const runwayRef = useRef(null);
  const stickyRef = useRef(null);
  const frameRef = useRef(null);
  const [{ progress, scrim, scrimTop }, setState] = useState(REST);

  const measure = useCallback(() => {
    frameRef.current = null;
    const runway = runwayRef.current;
    const sticky = stickyRef.current;
    if (!runway || !sticky) return;

    const scrollRoot = scrollRootRef?.current;
    // Scroll distance over which the figure stays pinned: everything in the runway that
    // the sticky element does not itself occupy. Read from the live layout rather than
    // the CSS heights so the two can be retuned independently.
    const runwayRect = runway.getBoundingClientRect();
    const stickyRect = sticky.getBoundingClientRect();
    const travel = runwayRect.height - stickyRect.height;
    if (travel <= 0) {
      setState({ ...REST, progress: runwayRect.top < 0 ? steps : 0 });
      return;
    }
    const pinTop = parseFloat(window.getComputedStyle(sticky).top) || 0;
    const scrollportTop = scrollRoot
      ? scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop
      : 0;
    const raw = clamp01((scrollportTop + pinTop - runwayRect.top) / travel);
    setState({
      progress: clamp01((raw - HOLD) / (1 - 2 * HOLD)) * steps,
      // Full strength for the pinned stretch, easing in at the start and back out over
      // the fade's trailing hold — so the map settles on its new state first and the text
      // beneath resolves as the figure lets go, rather than snapping back at release.
      scrim: clamp01(Math.min(raw / SCRIM_IN, (1 - raw) / HOLD)),
      scrimTop: stickyRect.bottom,
    });
  }, [scrollRootRef, steps]);

  useEffect(() => {
    // A reader who has asked for less motion gets the figure's own map, still, and no
    // scrim over the text under it.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      setState({ ...REST, progress: steps });
      return undefined;
    }

    const onScroll = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(measure);
      }
    };

    measure();
    const scrollTarget = scrollRootRef?.current || window;
    const scrollIsDrivenByParent = scrollOffset !== undefined;
    if (!scrollIsDrivenByParent) {
      scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("resize", onScroll);
    return () => {
      if (!scrollIsDrivenByParent) {
        scrollTarget.removeEventListener("scroll", onScroll);
      }
      window.removeEventListener("resize", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [measure, scrollOffset]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate?.();
    }
  };

  return (
    <div
      className="report-figure-fade"
      ref={runwayRef}
      style={{ "--fade-steps": steps }}
    >
      <div className="report-figure-fade-sticky" ref={stickyRef}>
        <div
          className={`report-figure-fade-stack${onActivate ? " report-figure-fade-stack-zoomable" : ""}`}
          role={onActivate ? "button" : undefined}
          aria-haspopup={onActivate ? "dialog" : undefined}
          tabIndex={onActivate ? 0 : undefined}
          onClick={onActivate}
          onKeyDown={onActivate ? handleKeyDown : undefined}
        >
          {/* The state being faded out carries no alt text: both images are one figure,
              and the caption describes the state the fade lands on. */}
          {earlier.map((src, index) => (
            <img
              key={src}
              className="report-figure-fade-img"
              src={src}
              alt=""
              aria-hidden="true"
              style={index === 0 ? undefined : { opacity: clamp01(progress - (index - 1)) }}
            />
          ))}
          <img
            className="report-figure-fade-img"
            src={to}
            alt={alt}
            style={{ opacity: clamp01(progress - (steps - 1)) }}
          />
        </div>
        {children}
        {/* Veils the strip of page between the pinned figure and the bottom of the
            viewport, so the text travelling up through it fades in rather than simply
            sliding into view. It is page-coloured, so dimming it from above reads as the
            text itself fading — and it stays a viewport-anchored overlay rather than
            per-paragraph opacity because what rises here crosses section boundaries
            (after figure 1.4 it is the next subsection) that no wrapper could span. */}
        <div
          className="report-figure-fade-scrim"
          aria-hidden="true"
          style={{ opacity: scrim, top: `${scrimTop}px` }}
        />
      </div>
      {/* The scroll runway. It has to be a sibling box rather than padding on the wrapper:
          a sticky element is confined to its containing block's content box, so padding
          would add scroll distance the pinning cannot reach and the figure would slide
          straight off the top instead of holding. */}
      <div className="report-figure-fade-runway" aria-hidden="true" />
    </div>
  );
};

export default ReportFigureFade;
