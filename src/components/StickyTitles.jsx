import { useEffect } from "react";
import {
  scrollToSection,
  NAV_HEIGHT,
  STICKY_TRIGGER_OFFSET,
} from "../utils/scrollToSection";
import "./StickyTitles.css";

/**
 * Fixed left-hand overlay of section titles, shared by the Report and
 * Methodology pages. Each `sections` entry is { id, level, title } and must
 * correspond to an element in the page with a matching `id`. That element may
 * also hold a `.section-title-placeholder` — an inline copy of the title in the
 * gutter, which this hides once the sticky copy takes over. Sections without
 * one simply have no inline copy to hide.
 *
 * Behaviour:
 * - A level-1 title sticks once its inline placeholder reaches the bottom of
 *   the stack of titles already pinned above it (calibrated cumulatively).
 * - level-2/3 titles nest beneath, shown only while their parent level-1 is
 *   active, and fade out as the next section's placeholder scrolls in.
 * - The active section/subsection is highlighted (scroll-spy), and the inline
 *   placeholder is hidden while its sticky title is shown.
 */
const StickyTitles = ({ sections = [] }) => {
  // Map each subsection id to its parent (nearest preceding level-1) id.
  const parentChapter = {};
  let lastChapter = null;
  for (const s of sections) {
    if (s.level === 1) lastChapter = s.id;
    else parentChapter[s.id] = lastChapter;
  }

  useEffect(() => {
    const updateStickyPosition = () => {
      const firstPlaceholder = document.querySelector(".section-title-placeholder");
      const stickyOverlay = document.querySelector(".sticky-titles-overlay");
      if (firstPlaceholder && stickyOverlay) {
        stickyOverlay.style.left = `${firstPlaceholder.getBoundingClientRect().left}px`;
      }
    };

    const handleScroll = () => {
      const overlay = document.querySelector(".sticky-titles-overlay");
      const overlayGap = 8; // matches .sticky-titles-overlay gap
      const overlayTopY = overlay ? overlay.getBoundingClientRect().top : NAV_HEIGHT + 60;

      // Height of a title as it will appear in the pinned stack. Sections from
      // the first chapter on have no inline placeholder to measure, and their
      // sticky title is display:none until shown, so fall back to its computed
      // line-height — that resolves to a pixel value whether or not it is laid
      // out, and the titles carry no vertical padding.
      const stackHeight = (el, id) => {
        const ph = el.querySelector(".section-title-placeholder");
        if (ph) return ph.getBoundingClientRect().height;
        const sticky = document.querySelector(`.sticky-title[data-section="${id}"]`);
        const lh = sticky ? parseFloat(getComputedStyle(sticky).lineHeight) : NaN;
        return Number.isFinite(lh) ? lh : 24;
      };

      // Each level-1 title sticks when its section reaches the BOTTOM of the
      // stack of titles already pinned above it — so the trigger grows as
      // titles accumulate, rather than a single fixed line.
      let stackBottom = overlayTopY;
      let activeChapterId = null;
      const chapterStuck = {};
      sections.forEach((s) => {
        if (s.level !== 1) return;
        const el = document.getElementById(s.id);
        if (!el) return;
        const stuck = el.getBoundingClientRect().top <= stackBottom;
        chapterStuck[s.id] = stuck;
        if (stuck) {
          activeChapterId = s.id;
          stackBottom += stackHeight(el, s.id) + overlayGap;
        }
      });

      // The chapter list unfolds as a whole: once the first chapter sticks,
      // every chapter is listed, so the reader sees the shape of the report
      // from the beginning rather than watching it accumulate one at a time.
      const firstChapter = sections.find((s) => s.nav === "chapter");
      const firstChapterReached = firstChapter ? !!chapterStuck[firstChapter.id] : false;

      // Active (deepest) section for highlighting — last heading past a fixed line.
      const readLine = NAV_HEIGHT + STICKY_TRIGGER_OFFSET;
      let activeSectionId = null;
      sections.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= readLine) activeSectionId = s.id;
      });

      // Fade the active chapter's subtitles as the next section's placeholder
      // rises from the bottom (begins on entry, gone by 75% viewport height).
      const vh = window.innerHeight;
      let subtitleOpacity = 1;
      for (const ph of document.querySelectorAll(".section-title-placeholder")) {
        const top = ph.getBoundingClientRect().top;
        if (top > readLine) {
          const fadeStart = vh;
          const fadeEnd = 0.75 * vh;
          subtitleOpacity = Math.max(0, Math.min(1, (top - fadeEnd) / (fadeStart - fadeEnd)));
          break;
        }
      }

      sections.forEach((s) => {
        const el = document.getElementById(s.id);
        const sticky = document.querySelector(`.sticky-title[data-section="${s.id}"]`);
        if (!el || !sticky) return;
        let show;
        if (s.nav === "chapter") show = firstChapterReached;
        else if (s.level === 1) show = chapterStuck[s.id];
        else show = parentChapter[s.id] === activeChapterId;
        sticky.classList.toggle("visible", show);
        sticky.classList.toggle("active", s.id === activeSectionId);
        if (s.level > 1) sticky.style.opacity = show ? String(subtitleOpacity) : "";
        if (s.level === 1) el.classList.toggle("invisible", chapterStuck[s.id]);
      });
    };

    document.querySelectorAll(".sticky-title").forEach((t) => t.classList.remove("visible"));
    updateStickyPosition();

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateStickyPosition);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateStickyPosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sticky-titles-overlay">
      {sections.map((section) => (
        <div
          key={section.id}
          className={`sticky-title${section.nav === "chapter" ? " sticky-title-chapter" : ""}${
            section.level > 1 ? " sticky-subtitle" : ""
          }`}
          data-section={section.id}
          onClick={() => scrollToSection(section.id)}
        >
          {section.title}
        </div>
      ))}
    </div>
  );
};

export default StickyTitles;
