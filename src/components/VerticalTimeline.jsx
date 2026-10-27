import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import './VerticalTimeline.css';
import GuideButton from './GuideButton';
import TimelineBar from './TimelineBar';
import YearMarker from './YearMarker';
import { getPanelViolationDots, getPanelPositionForDate } from '../utils/timelineDataUtils';
import { getPatternColor } from '../utils/patternColors';

// Break id sitting in the gap between two adjacent panels.
const GAP_BREAK_ID = [1, 2];

const VerticalTimeline = ({
  scrollPosition = null,
  currentScrollOffset = 0,
  maxScrollOffset = 0,
  onScrollToOffset,
  onSeekPanel,
  onGuideClick,
  onBreakClick,
  panels = [],
  guideTab,
  violations,
  activePatterns = [],
  onPatternStep,
  onPatternSeek,
  activeViolations = []
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  // While dragging, remember which panel the drag started in and its element so
  // the pointer maps to that panel's date range only (gaps are dead space).
  const dragRef = useRef(null);

  // In pattern mode, only violation stepping/seeking is allowed — break-line
  // jumps and the guide button are disabled.
  const patternsActive = activePatterns.length > 0;

  // Violation dots grouped by panel, each positioned as a % within its panel.
  const panelDots = useMemo(
    () => getPanelViolationDots(panels, violations),
    [panels, violations]
  );

  // A year straddling a break appears as a box in every panel it touches, but is
  // only labelled in the panel holding the most of it (e.g. the 2021 sliver atop
  // panel B and the 2023 sliver at its foot stay unlabelled).
  const dominantPanelByYear = useMemo(() => {
    const best = {};
    panels.forEach((panel, pi) => {
      Object.values(panel.yearGroups || {}).forEach(group => {
        if (!best[group.year] || group.itemCount > best[group.year].count) {
          best[group.year] = { panel: pi, count: group.itemCount };
        }
      });
    });
    return best;
  }, [panels]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (patternsActive) {
      if (onPatternStep) onPatternStep(Math.sign(e.deltaY));
    } else if (onScrollToOffset) {
      const newOffset = Math.max(0, Math.min(maxScrollOffset, currentScrollOffset + e.deltaY));
      onScrollToOffset(newOffset);
    }
  }, [patternsActive, onPatternStep, onScrollToOffset, currentScrollOffset, maxScrollOffset]);

  // Attach wheel as a non-passive listener so preventDefault actually works.
  // React 19 registers onWheel passively, which makes preventDefault a no-op
  // and logs "Unable to preventDefault inside passive event listener".
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Map a pointer position to a seek within a single panel. In pattern mode this
  // snaps to the nearest active violation inside that panel; otherwise it maps to
  // that panel's slice of the table date range.
  const seekWithinPanel = useCallback((clientY, panelIndex, el) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    if (patternsActive) {
      if (!activeViolations.length || !onPatternSeek) return;
      let nearestIndex = -1;
      let minDistance = Infinity;
      activeViolations.forEach((violation, index) => {
        const pos = getPanelPositionForDate(panels, violation.date);
        if (pos && pos.panel === panelIndex) {
          const distance = Math.abs(pos.ratio - ratio);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = index;
          }
        }
      });
      if (nearestIndex >= 0) onPatternSeek(nearestIndex);
    } else if (onSeekPanel) {
      onSeekPanel(panelIndex, ratio);
    }
  }, [patternsActive, activeViolations, onPatternSeek, onSeekPanel, panels]);

  const handleDocumentMouseMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    seekWithinPanel(e.clientY, drag.panelIndex, drag.el);
  }, [seekWithinPanel]);

  const handleDocumentMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [handleDocumentMouseMove, handleDocumentMouseUp]);

  const handlePanelMouseDown = (e, panelIndex) => {
    dragRef.current = { panelIndex, el: e.currentTarget };
    seekWithinPanel(e.clientY, panelIndex, e.currentTarget);
  };

  const handleGapClick = (breakId) => {
    if (!patternsActive) onBreakClick?.(breakId);
  };

  const timelineHighlighted = guideTab === 'timeline';

  const renderPanel = (panel, panelIndex) => {
    const total = panel.totalItems || 0;
    const yearGroups = Object.values(panel.yearGroups || {})
      .filter(g => g.year !== '2016')
      .sort((a, b) => a.startIndex - b.startIndex);
    const dots = panelDots[panelIndex] || [];

    return (
      <div
        key={panelIndex}
        className={`timeline-panel${timelineHighlighted ? ' timeline-panel-highlighted' : ''}`}
        style={{ flexGrow: total || 1, flexBasis: 0 }}
        onMouseDown={(e) => handlePanelMouseDown(e, panelIndex)}
      >
        {/* Year cells + violation dots (left gutter) */}
        <div className="timeline-years">
          {yearGroups.map((group, gi) => {
            const startFrac = total ? group.startIndex / total : 0;
            const endFrac = gi < yearGroups.length - 1
              ? yearGroups[gi + 1].startIndex / total
              : 1;
            return (
              <YearMarker
                key={group.year}
                year={group.year}
                topPosition={startFrac * 100}
                heightPosition={(endFrac - startFrac) * 100}
                showLabel={dominantPanelByYear[group.year]?.panel === panelIndex}
              />
            );
          })}
          {dots.map(d => {
            const matchedKeys = Array.isArray(d.patterns) ? d.patterns.filter(p => activePatterns.includes(p)) : [];
            const isActive = matchedKeys.length > 0;
            const earliestKey = isActive
              ? matchedKeys.reduce((best, key) =>
                  activePatterns.indexOf(key) < activePatterns.indexOf(best) ? key : best
                )
              : null;
            const color = earliestKey ? getPatternColor(earliestKey, activePatterns) : null;
            return (
              <div
                key={d.id}
                className={`timeline-violation-dot${isActive ? ' active' : ''}`}
                style={{
                  top: `${d.topPct}%`,
                  ...(color ? { borderColor: color, background: color } : {})
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            );
          })}
        </div>

        {/* Timeline bars column */}
        <div className="timeline-bars">
          {panel.items.map((item, index) => {
            const itemKey = item.weekKey || item.date || index;
            return (
              <div
                key={`${itemKey}-${index}`}
                className="timeline-bar-wrapper"
                style={{ height: `${total ? 100 / total : 0}%` }}
              >
                <TimelineBar
                  normalizedGrey={item.normalizedGrey}
                  normalizedBlue={item.normalizedBlue}
                  normalizedPurple={item.normalizedPurple}
                  hasData={item.hasData}
                  // Panel 2 (post-25 Jan 2023) shows EUNAVFOR MED Irini cases in
                  // the wide stripe, not JORA boats.
                  leftChannel={panelIndex === 2 ? 'purple' : 'grey'}
                />
              </div>
            );
          })}
        </div>

        {/* Scroll indicator — only in the panel the table is currently within */}
        {scrollPosition && scrollPosition.panel === panelIndex && (
          <div
            className="scroll-indicator"
            style={{ top: `${scrollPosition.ratio * 100}%` }}
          />
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`vertical-timeline${patternsActive ? ' pattern-mode' : ''}`}>
      {/* External header - aligns with external-headers-row in main data */}
      <div className={`timeline-external-header${guideTab === 'timeline' ? ' timeline-external-header-highlighted' : ''}`}>
        <div className="external-header-cell timeline-title">
          <span>Timeline</span>
          {onGuideClick && (
            <GuideButton
              onClick={() => { if (!patternsActive) onGuideClick('timeline'); }}
              ariaLabel="Show timeline guide"
            />
          )}
        </div>
      </div>

      {/* Column header - aligns with column-headers-row in main data */}
      <div className="timeline-column-header">
      </div>

      {/* Timeline content — three gapped panels */}
      <div ref={contentRef} className="timeline-content">
        {panels.map((panel, panelIndex) => (
          <React.Fragment key={panelIndex}>
            {renderPanel(panel, panelIndex)}
            {panelIndex < panels.length - 1 && (
              <div
                className={`timeline-gap${patternsActive ? ' disabled' : ''}${timelineHighlighted ? ' timeline-gap-highlighted' : ''}`}
                onClick={() => handleGapClick(GAP_BREAK_ID[panelIndex])}
                title="Jump to dataset break"
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default VerticalTimeline;
