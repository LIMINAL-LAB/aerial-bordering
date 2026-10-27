import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import patternsData from '../data/patterns.json';
import IdentifiedAircraft from './IdentifiedAircraft';
import ViolationMedia from './ViolationMedia';

const getSourceDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// Each pattern in src/data/patterns.json is discussed by one subsection of the
// report (ids from src/data/report.json). Violations carrying no pattern link to
// the chapter those subsections live in. All 38 cases carry a pattern today, so
// the fallback is unreachable — it is kept as a guard for cases that arrive
// untagged from a regeneration of PATTERNS_ALL.xlsx, not a live branch.
const REPORT_SECTION_BY_PATTERN = {
  'selective-comms': 'selective-communication',
  'mt-sar': 'extending-the-libyan-coast-guard-s-reach',
  violence: 'witnessing-direct-violence'
};
const FALLBACK_REPORT_SECTION = 'chapter-2-aerial-operations-2017-2025';

// The map above is hand-maintained against two generated files — patterns.json
// (keys) and report.json (section ids) — so a regeneration that renames either
// side would silently route every affected case to the fallback chapter rather
// than error. Name the unmapped key in development so the drift is caught here
// instead of read as a wrong link on the page.
if (import.meta.env.DEV) {
  const unmapped = patternsData
    .map((pattern) => pattern.key)
    .filter((key) => !REPORT_SECTION_BY_PATTERN[key]);
  if (unmapped.length > 0) {
    console.error(
      `ViolationRow: no report section mapped for pattern(s) ${unmapped.join(', ')}. ` +
      'Every "Read more about this violation" link on those cases falls back to ' +
      `#${FALLBACK_REPORT_SECTION}. Add them to REPORT_SECTION_BY_PATTERN.`
    );
  }
}

// A violation carrying several patterns links to the first one. That order is
// the generator's fixed column order (PATTERNS in produce_violations_data.py),
// not the case's own emphasis, but it is also the order the pattern tags render
// in above, so the link matches the first tag the reader sees.
//
// Read violation.patterns, not the matchedPatterns prop: that one is filtered
// down to the patterns currently switched on, so it is empty most of the time.
const reportLinkFor = (violation) => {
  const first = (violation.patterns || [])[0];
  return `/report#${REPORT_SECTION_BY_PATTERN[first] || FALLBACK_REPORT_SECTION}`;
};

const ViolationRow = ({ style, violation, matchedPatterns = [], assets, mainColumnsCount, totalColumnsCount, gridColumns, onMeasureHeight, patternsActive, isActiveViolation }) => {
  const outerRef = useRef(null);

  useLayoutEffect(() => {
    const outerEl = outerRef.current;
    if (!outerEl || !onMeasureHeight || !violation) return undefined;

    const measure = () => {
      onMeasureHeight(violation.id, outerEl.offsetHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(outerEl);
    return () => observer.disconnect();
  }, [violation, onMeasureHeight]);

  if (!violation) return null;

  const rightColumnCount = totalColumnsCount - mainColumnsCount;

  const paragraphs = violation.infoText ? violation.infoText.split(/\n\s*\n/) : [];

  return (
    <div
      style={{
        ...style,
        gridTemplateColumns: gridColumns
      }}
      className={`unified-table-row violation-row-outer${patternsActive && isActiveViolation ? ' violation-active' : ''}`}
    >
      <div
        ref={outerRef}
        className="row-card violation-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'subgrid',
          gridColumn: `1 / span ${totalColumnsCount}`
        }}
      >
        <div
          className="violation-date-cell"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          <span>{violation.date}</span>
        </div>

        <div
          className="violation-pattern-tags"
          style={{ gridColumn: `2 / span ${totalColumnsCount - 1}`, gridRow: 1 }}
        >
          {matchedPatterns.map((tag) => (
            <div key={tag.key} className="violation-pattern-tag">
              <span className="violation-pattern-dot" style={{ background: tag.color }} />
              <span className="violation-pattern-label" style={{ color: tag.color }}>{tag.label}</span>
            </div>
          ))}
        </div>
        <div
          className="violation-meta-cell"
          style={{ gridColumn: 2, gridRow: 2 }}
        >
          <div className="violation-jora-id">
            <div className="violation-jora-id-value">{violation.joraId}</div>
          </div>
        </div>

        {/* content: cols 3+ — the only part that scrolls under the pinned header */}
        <div
          className="violation-row-content"
          style={{ gridColumn: `3 / span ${mainColumnsCount - 2}`, gridRow: 2 }}
        >
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="violation-info-text">{paragraph}</p>
          ))}

          <ViolationMedia media={violation.media} />

          <Link
            to={reportLinkFor(violation)}
            className="violation-read-more"
          >
            ← Read more about this violation
          </Link>

          {violation.links && violation.links.length > 0 && (
            <div className="violation-links">
              {violation.links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="violation-link"
                >
                  {link.type === 'source' ? (
                    <>{getSourceDomain(link.url)} ↗</>
                  ) : (
                    link.label
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {rightColumnCount > 0 && assets && assets.length > 0 && (
        <div
          className="violation-aircraft-track"
          style={{ gridRow: 1, gridColumn: `${mainColumnsCount + 1} / span ${rightColumnCount}` }}
        >
          <div className="violation-aircraft-sticky">
            <div className="violation-aircraft-overlay">
              <IdentifiedAircraft assets={assets} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationRow;
