export const NAV_HEIGHT = 50; // Height of navigation bar
export const STICKY_TRIGGER_OFFSET = 130; // Reading line offset below the nav

// Scroll to a section / footnote / footnote-ref, accounting for the nav
// bar and sticky titles. Shared by the Report and Methodology pages. Smooth
// by default; callers arriving from another page pass "auto" so the reader
// lands already positioned instead of watching the page scroll into place.
export function scrollToSection(sectionId, behavior = "smooth") {
  const element = document.getElementById(sectionId);
  if (!element) return;

  // Update-note anchors are inline editorial annotations, so centre the note
  // in the viewport rather than using the section/footnote top positioning.
  if (sectionId.includes("update-note")) {
    const elementPosition = element.getBoundingClientRect().top;
    const elementHeight = element.offsetHeight;
    const offsetPosition =
      elementPosition +
      window.pageYOffset -
      (window.innerHeight - elementHeight) / 2;

    window.scrollTo({ top: Math.max(0, offsetPosition), behavior });
    return;
  }

  // A section lands just under the nav rather than mid-page: the heading must
  // clear the scroll-spy read line (NAV_HEIGHT + STICKY_TRIGGER_OFFSET) or the
  // gutter title the reader just clicked never highlights.
  const isFootnote =
    sectionId.startsWith("footnote-") && !sectionId.startsWith("footnote-ref-");
  const offset = isFootnote ? 80 : 20;

  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - NAV_HEIGHT - offset;

  window.scrollTo({ top: offsetPosition, behavior });
}
