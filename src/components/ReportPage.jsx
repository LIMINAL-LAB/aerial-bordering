import React, { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import reportData from "../data/report.json";
import abstractData from "../data/abstract.json";
import ReportFigure from "./ReportFigure";
import StickyTitles from "./StickyTitles";
import { scrollToSection } from "../utils/scrollToSection";
import "./ReportPage.css";

// Return-to-text arrow used by each footnote.
const ReturnArrow = ({ n }) => {
  const navigate = useNavigate();
  return (
    <span
      className="return-link clickable"
      onClick={() => navigate(`#footnote-ref-${n}`)}
      title="Return to text"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M7 13L1 7L7 1M1 7H13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};

// Superscript footnote number in the prose. Leaves a two-entry history trail
// (replace the reader's spot, then push the note) so one Back lands back on
// the text, mirroring ReturnArrow.
const FootnoteRef = ({ n }) => {
  const navigate = useNavigate();
  return (
    <span
      id={`footnote-ref-${n}`}
      className="footnote clickable"
      onClick={() => {
        navigate(`#footnote-ref-${n}`, { replace: true });
        navigate(`#footnote-${n}`);
      }}
    >
      {n}
    </span>
  );
};

// Wrap a run's text in <strong>/<em> per its bold/italic flags, composing when both are set.
const withEmphasis = (text, run) => {
  let node = text;
  if (run.italic) node = <em>{node}</em>;
  if (run.bold) node = <strong>{node}</strong>;
  return node;
};

// Render a paragraph/footnote run list: plain text, links, and footnote refs.
const renderRuns = (runs = []) =>
  runs.map((run, i) => {
    if (run.footnoteRef != null) {
      const n = run.footnoteRef;
      return <FootnoteRef key={i} n={n} />;
    }
    if (run.link) {
      const { href, external } = run.link;
      // In-report anchor (e.g. #conclusions): smooth-scroll to that section.
      if (href.startsWith("#")) {
        return (
          <span
            key={i}
            className="report-inline-link clickable"
            onClick={() => scrollToSection(href.slice(1))}
          >
            {withEmphasis(run.text, run)}
          </span>
        );
      }
      // Internal app route: use react-router so there's no full reload.
      if (!external && href.startsWith("/")) {
        return (
          <Link key={i} to={href} className="report-inline-link">
            {withEmphasis(run.text, run)}
          </Link>
        );
      }
      return (
        <a
          key={i}
          href={href}
          className="report-inline-link"
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {withEmphasis(run.text, run)}
        </a>
      );
    }
    return <React.Fragment key={i}>{withEmphasis(run.text, run)}</React.Fragment>;
  });

const renderBlock = (block, i) => {
  switch (block.type) {
    case "paragraph":
      return <p key={i} className="justify-text">{renderRuns(block.runs)}</p>;
    case "figure":
      return (
        <ReportFigure
          key={block.id || i}
          number={block.number}
          src={block.src}
          fadeFrom={block.fadeFrom}
          images={block.images}
          caption={block.caption}
        />
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag key={i} className="report-list">
          {(block.items || []).map((item, j) => (
            <li key={j} className="justify-text">{renderRuns(item.runs)}</li>
          ))}
        </Tag>
      );
    }
    case "database-link":
      return (
        <Link key={i} to={block.href} className="report-database-link">
          See all cases of {block.label} in the database →
        </Link>
      );
    default:
      return null;
  }
};

// Group the flat section list so each level-1 section carries its trailing
// level-2/3 subsections inside its content column.
const groupSections = (sections) => {
  const groups = [];
  let current = null;
  for (const section of sections) {
    if (section.level === 1 || !current) {
      current = { section, children: [] };
      groups.push(current);
    } else {
      current.children.push(section);
    }
  }
  return groups;
};

const ReportPage = () => {
  const { sections = [], footnotes = [] } = reportData;
  const groups = groupSections(sections);

  // Arriving from another page with a fragment (e.g. /report#witnessing-direct-violence)
  // must land on that section; react-router does not scroll on navigation. Footnote
  // jumps and returns now arrive this way too (FootnoteRef/ReturnArrow navigate to a
  // hash rather than scrolling directly), so `key` is in the dependency list as well:
  // react-router gives every history entry a fresh key, including a push to an
  // identical hash, so clicking the same footnote twice in a row still re-fires this.
  const { hash, key } = useLocation();
  // The first hash the page sees is the one it was navigated to with, e.g. from a
  // database case linking to its pattern: land there outright rather than showing the
  // reader a long scroll down from the top ("instant", since "auto" obeys the smooth
  // scroll-behavior on <html>). Footnote jumps made once already reading
  // keep the smooth scroll, which is what shows where they went.
  // Keyed on the history entry rather than a boolean: StrictMode replays this effect on
  // mount with the same refs, and a boolean set by the first run would turn the replay
  // (the one that ends up scrolling) smooth.
  const arrivalKeyRef = useRef(null);
  useEffect(() => {
    if (!hash) return undefined;
    if (arrivalKeyRef.current === null) arrivalKeyRef.current = key;
    const behavior = arrivalKeyRef.current === key ? "instant" : "smooth";
    const id = decodeURIComponent(hash.slice(1));
    // One tick after paint, so the sections have their final layout before we measure.
    const timer = setTimeout(() => scrollToSection(id, behavior), 0);

    // Report figures are height:auto with no aspect-ratio reserved, so every one
    // still loading above the target keeps pushing it further down as it resolves —
    // a single post-paint scroll lands short. Re-scroll as each pending image
    // settles. Footnote jumps reach this effect too, but by then the reader has
    // already scrolled past those images, so there is nothing pending to correct.
    const pending = Array.from(
      document.querySelectorAll(".report-content img")
    ).filter((img) => !img.complete);
    const rescroll = () => scrollToSection(id, behavior);
    pending.forEach((img) => {
      img.addEventListener("load", rescroll);
      img.addEventListener("error", rescroll);
    });

    return () => {
      clearTimeout(timer);
      pending.forEach((img) => {
        img.removeEventListener("load", rescroll);
        img.removeEventListener("error", rescroll);
      });
    };
  }, [hash, key]);

  // The Abstract, Index and Notes blocks aren't content sections but should
  // behave like chapters in the sticky overlay (their titles stick once
  // scrolled to). Abstract leads, so it shifts the other sticky titles down.
  // Only chapters appear — subsection titles are too long for the nav — and
  // each chapter uses its short `navTitle` rather than its full heading.
  // `nav` splits the overlay into two type groups: the document-level entries
  // stay Regular L, the chapters read as a smaller, bolder list beneath them.
  // "Chapter 1 – The Shift…" splits into a left-hand label and a title that
  // lines up with the indented entries below it; the dash is dropped.
  const renderTocTitle = (title) => {
    const match = title.match(/^(Chapter\s+\d+)\s*[–-]\s*(.+)$/);
    if (!match) return title;
    return (
      <>
        <span className="report-toc-label">{match[1]}</span>
        <span>{match[2]}</span>
      </>
    );
  };

  const overlaySections = [
    { id: "abstract", level: 1, nav: "document", title: "Abstract" },
    { id: "contents", level: 1, nav: "document", title: "Index" },
    ...sections
      .filter((s) => s.level === 1)
      .map((s) => ({ id: s.id, level: 1, nav: "chapter", title: s.navTitle || s.title })),
    ...(footnotes.length > 0
      ? [{ id: "notes", level: 1, nav: "chapter", title: "Notes" }]
      : []),
  ];

  return (
    <div className="report-page">
      <StickyTitles sections={overlaySections} />

      <div className="report-container">
        <div className="report-content">
          {/* Abstract — opens the report, above the index */}
          <div id="abstract" className="section-container">
            <div className="section-title-placeholder">Abstract</div>
            <div className="section-content">
              {(abstractData.blocks || []).map(renderBlock)}
            </div>
          </div>

          {/* Index — every chapter and subsection, clickable */}
          <div id="contents" className="section-container">
            <div className="section-title-placeholder">Index</div>
            <div className="section-content">
              <ul className="report-toc">
                {sections.filter((s) => s.level <= 2).map((section) => (
                  <li
                    key={section.id}
                    className={`report-toc-item level-${section.level}`}
                  >
                    <button
                      className="report-toc-link"
                      onClick={() => scrollToSection(section.id)}
                    >
                      {renderTocTitle(section.title)}
                    </button>
                    <span className="report-toc-divider" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {groups.map(({ section, children }) => (
            <div key={section.id} id={section.id} className="section-container no-gutter">
              <div className="section-content">
                {/* Full chapter title: the gutter/nav only carries the short one. */}
                <div className="section-heading">
                  <div className="section-heading-title">{section.title}</div>
                  <div className="section-heading-divider"></div>
                </div>
                {section.blocks.map(renderBlock)}
                {children.map((child) => (
                  <div key={child.id} id={child.id} className={`subsection level-${child.level}`}>
                    <div className="subsection-header">
                      <div className="subsection-title">{child.title}</div>
                      <div className="subsection-divider"></div>
                    </div>
                    <div className="subsection-content">{child.blocks.map(renderBlock)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {footnotes.length > 0 && (
            <div id="notes" className="section-container no-gutter">
              <div className="section-content">
                <div className="notes-section">
                  <div className="notes-list">
                    {footnotes.map((f) => (
                      <div key={f.n} id={`footnote-${f.n}`} className="note-item">
                        <div className="note-number">{f.n}</div>
                        <div className="note-content justify-text">
                          {renderRuns(f.runs)}
                          <ReturnArrow n={f.n} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Download Button */}
      <a className="pdf-download" href="/downloads/LIMINAL_AerialBordering_Report.pdf" download>
        <svg width="14" height="17" viewBox="0 0 14 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1 8.64305L7 15L13 8.64305L12.2766 7.95943L7.4975 13.0229L7.4975 1L6.5025 1L6.5025 13.0229L1.72338 7.95943L1 8.64305Z"
            fill="white"
            stroke="white"
            strokeWidth="0.5"
            strokeMiterlimit="10"
          />
        </svg>
        <span>PDF</span>
      </a>
    </div>
  );
};

export default ReportPage;
