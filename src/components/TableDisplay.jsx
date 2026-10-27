import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { List } from 'react-window';
import VirtualizedTableRow from './VirtualizedTableRow';
import useScrollStore from '../store/scrollStore';
import GuideButton from './GuideButton';
import { generateDateRange } from '../utils/timelineDataUtils';
import { getPatternColor } from '../utils/patternColors';
import patternsData from '../data/patterns.json';
import {
  HEADER_HEIGHT,
  ROW_HEIGHT,
  BREAK_1_HEIGHT,
  BREAK_2_HEIGHT,
  BREAK_1_AFTER_DATE,
  BREAK_2_AFTER_DATE,
  VIOLATION_ROW_HEIGHT,
  VIOLATION_ROW_MEDIA_ALLOWANCE
} from '../constants';
import './TableDisplay.css';

const patternLabelByKey = patternsData.reduce((acc, pattern) => {
  acc[pattern.key] = pattern.label;
  return acc;
}, {});

function toKebabCase(str) {
  return str
    // Insert a hyphen before all uppercase letters
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    // Replace spaces, underscores, and other non-word characters with hyphens
    .replace(/[\s_]+/g, '-')
    // Convert to lowercase
    .toLowerCase();
}

const getProcessedMainData = (data, activeViolations = [], activePatterns = []) => {
  if (!data || typeof data !== 'object') return [];

  // Build date->violation map from activeViolations
  const violationByDate = {};
  activeViolations.forEach((violation) => {
    if (violation.date) {
      violationByDate[violation.date] = violation;
    }
  });

  // Get all dates from the data and sort them
  const dataEntries = Object.entries(data);
  if (dataEntries.length === 0) return [];

  const dateDates = dataEntries.map(([date]) => date).sort();
  const firstDate = dateDates[0];
  const lastDate = dateDates[dateDates.length - 1];

  // Generate all dates in the range
  const allDates = generateDateRange(firstDate, lastDate);

  const flatData = [];
  let addedBreak1 = false;
  let addedBreak2 = false;

  allDates.forEach((date, dateIndex) => {
    const childRows = data[date];
    const hasJoraData = Array.isArray(childRows) && childRows.length > 0;

    // Always add a date header row
    flatData.push({
      date: date,
      originalDate: date,
      dateGroup: date,
      isDateRow: true,
      hasJoraData: hasJoraData,
      isEmpty: !hasJoraData
    });

    // If there is JORA data, add the data rows
    if (hasJoraData) {
      childRows.forEach((childRow, childIndex) => {
        flatData.push({
          ...childRow,
          date: '', // Don't show date in data rows
          originalDate: date,
          dateGroup: date,
          isDateRow: false,
          hasJoraData: true,
          isEmpty: false,
          isFirstChild: childIndex === 0
        });
      });
    }

    // Insert break row AFTER the specified date
    if (date === BREAK_1_AFTER_DATE && !addedBreak1) {
      flatData.push({
        isBreakRow: true,
        breakId: 1,
        breakHeight: BREAK_1_HEIGHT,
        dateGroup: date,
        date: ''
      });
      addedBreak1 = true;
    }

    // Insert second break row AFTER its date
    if (date === BREAK_2_AFTER_DATE && !addedBreak2) {
      flatData.push({
        isBreakRow: true,
        breakId: 2,
        breakHeight: BREAK_2_HEIGHT,
        dateGroup: date,
        date: ''
      });
      addedBreak2 = true;
    }

    // Insert violation row if this date has an active violation
    if (violationByDate[date]) {
      const violation = violationByDate[date];
      const matchedPatterns = (violation.patterns || [])
        .filter((key) => activePatterns.includes(key))
        .map((key) => ({
          key,
          label: patternLabelByKey[key] || key,
          color: getPatternColor(key, activePatterns)
        }));
      const renderableMedia = (violation.media || []).filter((item) => item.url);
      const hasImages = renderableMedia.some((item) => item.type === 'image');
      const nonImageCount = renderableMedia.filter((item) => item.type !== 'image').length;
      // Images render as a single carousel unit; each non-image (pdf card, video) adds one allowance
      const mediaAllowance = (hasImages ? 1 : 0) + nonImageCount;

      flatData.push({
        isViolationRow: true,
        violation,
        matchedPatterns,
        expandHeight: mediaAllowance > 0
          ? VIOLATION_ROW_HEIGHT + mediaAllowance * VIOLATION_ROW_MEDIA_ALLOWANCE
          : VIOLATION_ROW_HEIGHT,
        dateGroup: date,
        date: ''
      });
    }
  });

  return flatData;
};

const getProcessedColumnarData = (data) => {
  if (!data || typeof data !== 'object') return [];

  const flatData = [];
  Object.entries(data).forEach(([date, childRows]) => {
    if (Array.isArray(childRows)) {
      childRows.forEach((childRow) => {
        flatData.push({
          ...childRow,
          date: date,
          originalDate: date,
          dateGroup: date,
          isDateRow: true  // Columnar rows are treated as date-level data
        });
      });
    }
  });

  return flatData;
};

const TableDisplay = ({
  mainData,
  mainColumns,
  mainProps,
  columnarDisplays = [],
  selectedRow,
  onRowSelect,
  cellHoverColor,
  synthesizedDisplay,
  onScroll,
  scrollRequest,
  onGuideClick,
  guideTab,
  onDataChange,
  onViolationHeightsChange,
  allViolationDates,
  activeViolations = [],
  activePatterns = [],
  activeViolationDate = null,
  onPatternStep,
  onViolationDotClick,
  onContainerHeightChange
}) => {
  const [hoveredRowData, setHoveredRowData] = useState(null);
  const [hoveredDateGroup, setHoveredDateGroup] = useState(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [violationHeights, setViolationHeights] = useState({});
  const listRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const containerRef = useRef(null);
  const columnHeadersRef = useRef(null);

  // Zustand store
  const { setScrollOffset, setSortedMainData, peoplePushedBackCount } = useScrollStore();

  // In pattern mode the table is locked to violation snapping only — all other
  // interactions (row select, hover, scroll, guide) are disabled.
  const patternsActive = activePatterns.length > 0;

  const mainProcessedData = useMemo(
    () => getProcessedMainData(mainData, activeViolations, activePatterns),
    [mainData, activeViolations, activePatterns]
  );
  const columnarProcessedData = useMemo(() =>
    columnarDisplays.map(col => getProcessedColumnarData(col.data)),
    [columnarDisplays]
  );

  const sortedMainData = mainProcessedData;

  // Update store when sorted data changes
  useEffect(() => {
    setSortedMainData(sortedMainData);
  }, [sortedMainData, setSortedMainData]);

  // Notify parent when sorted data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange(sortedMainData);
    }
  }, [sortedMainData, onDataChange]);

  const handleRowHover = useCallback((rowIndex) => {
    // Disable hover highlighting in pattern mode; clear any lingering hover.
    if (patternsActive) {
      if (hoveredDateGroup !== null) {
        setHoveredDateGroup(null);
        setHoveredRowData(null);
      }
      return;
    }
    if (rowIndex !== null) {
      // Get the date group of the hovered row
      const hoveredDate = sortedMainData[rowIndex]?.dateGroup;

      // Only update if the date group changed
      if (hoveredDate !== hoveredDateGroup) {
        setHoveredDateGroup(hoveredDate);

        if (cellHoverColor) {
          // Build rowData structure for the hovered row
          const rowData = { tabular: sortedMainData[rowIndex] };

          columnarProcessedData.forEach((colData, colIndex) => {
            // Find matching columnar data by dateGroup instead of using rowIndex
            const matchingColData = colData.find(
              row => row.isDateRow && row.dateGroup === hoveredDate
            );
            rowData[`column${colIndex + 1}`] = matchingColData;
          });

          setHoveredRowData(rowData);
        }
      }
    } else {
      if (hoveredDateGroup !== null) {
        setHoveredDateGroup(null);
        setHoveredRowData(null);
      }
    }
  }, [sortedMainData, columnarProcessedData, cellHoverColor, hoveredDateGroup, patternsActive]);

  const handleRowSelect = (item, index) => {
    if (patternsActive) return;
    if (onRowSelect) {
      onRowSelect(item, index);
    }
  };

  const handleRowClick = (item, index) => {
    handleRowSelect(item, index);
  };

  // Get hover color if available
  const hoverColor = hoveredRowData && cellHoverColor ? cellHoverColor(hoveredRowData) : null;

  // Helper functions from original components
  const getColumnTitle = mainProps.getColumnTitle || ((key) => key);

  // Determine which sections should be highlighted based on guide state
  const shouldHighlightFrontex = guideTab === 'jora-data';
  const shouldHighlightIrini = guideTab === 'jora-data';
  const shouldHighlightPeoplePushedBack = guideTab === 'migrants-deterred';
  const shouldHighlightMigrantsColumn = guideTab === 'migrants-deterred';
  const shouldHighlightDetectionColumn = guideTab === 'detection';
  const shouldHighlightDisembarkationColumn = guideTab === 'disembarkation';
  const shouldHighlightFlightColumn = guideTab === 'open-source';

  // Create grid template with 10 equal-width columns:
  // - 8 main data columns
  // - 1 columnar display column (with gap as left padding)
  // - 1 synthesis column
  const mainGridColumns = mainColumns.map(() => 'var(--nav-subcolumn-width)').join(' ');
  const columnarGridColumns = columnarDisplays.map(() => 'var(--nav-subcolumn-width)').join(' ');

  const gridColumns = [mainGridColumns, columnarGridColumns].filter(Boolean).join(' ');

  // Reset measured violation heights whenever the active violation set changes,
  // since the previous measurements no longer correspond to the new rows.
  useEffect(() => {
    setViolationHeights({});
  }, [activeViolations]);

  const handleMeasureViolationHeight = useCallback((violationId, height) => {
    setViolationHeights((prev) => {
      if (prev[violationId] === height) return prev;
      const next = { ...prev, [violationId]: height };
      onViolationHeightsChange?.(next);
      return next;
    });
  }, [onViolationHeightsChange]);

  // Row height function - variable for break rows and violation rows
  const rowHeight = useCallback((index) => {
    const row = sortedMainData[index];
    if (row?.isBreakRow) return row.breakHeight;
    if (row?.isViolationRow) return violationHeights[row.violation.id] ?? row.expandHeight;
    return ROW_HEIGHT;
  }, [sortedMainData, violationHeights]);

  // Item data for virtualized list
  const itemData = {
    sortedMainData,
    columnarProcessedData,
    columnarDisplays,
    mainColumns,
    selectedRow,
    hoveredDateGroup,
    hoverColor,
    handleRowClick,
    handleRowHover,
    synthesizedDisplay,
    gridColumns,
    guideTab,
    shouldHighlightDetectionColumn,
    shouldHighlightDisembarkationColumn,
    shouldHighlightMigrantsColumn,
    shouldHighlightFlightColumn,
    onMeasureHeight: handleMeasureViolationHeight,
    patternsActive,
    allViolationDates,
    activeViolationDate,
    onViolationDotClick
  };

  // Calculate container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = rect.height - HEADER_HEIGHT;
        const nextHeight = Math.max(availableHeight, 300);
        setContainerHeight(nextHeight);
        onContainerHeightChange?.(nextHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [onContainerHeightChange]);

  // Handle programmatic scroll from timeline
  useEffect(() => {
    if (!scrollRequest || scrollRequest.counter === 0) return;

    const targetOffset = scrollRequest.offset;

    if (!listRef.current) return;

    // Get the outer element - this IS the scrollable element!
    const element = listRef.current.element;

    if (!element) return;

    // Defer to the next frame so the scroll lands after react-window has
    // committed any newly-inserted rows (e.g. violation expansion rows).
    // Setting scrollTop in the same tick can be clamped to the pre-expansion
    // height and effectively ignored.
    const rafId = requestAnimationFrame(() => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }

      if (!scrollRequest.animate) {
        // The element itself is scrollable (has overflow-y: auto)
        element.scrollTop = targetOffset;
        return;
      }

      // Animate through the intervening rows over a fixed duration, rather
      // than jumping straight to the target (used for violation snapping).
      const startOffset = element.scrollTop;
      const distance = targetOffset - startOffset;
      const duration = 400;
      const startTime = performance.now();
      const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

      const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        element.scrollTop = startOffset + distance * easeInOutCubic(t);
        scrollAnimationRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };

      scrollAnimationRef.current = requestAnimationFrame(step);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
    };
  }, [scrollRequest]);

  // Handle scroll events and notify parent
  const handleScroll = useCallback((event) => {
    if (onScroll) {
      const scrollableElement = event.currentTarget;
      const scrollOffset = scrollableElement.scrollTop;

      // Calculate total height accounting for variable row heights
      const totalHeight = sortedMainData.reduce((sum, row, index) => {
        return sum + (typeof rowHeight === 'function' ? rowHeight(index) : rowHeight);
      }, 0);

      const scrollableHeight = totalHeight - containerHeight;
      const scrollRatio = scrollableHeight > 0 ? scrollOffset / scrollableHeight : 0;

      // Update store with scroll offset
      setScrollOffset(scrollOffset);

      onScroll(scrollOffset, scrollRatio, scrollableHeight);
    }
  }, [onScroll, sortedMainData, rowHeight, containerHeight, setScrollOffset]);

  // Handle wheel events for pattern stepping (only when patterns are active)
  const handleWheel = useCallback((event) => {
    if (activePatterns.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      if (onPatternStep) {
        // Pass the raw deltaY so intra-card scrolling tracks the wheel/trackpad
        // smoothly; DatabasePage uses its sign to step between violations.
        onPatternStep(event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY);
      }
    }
  }, [activePatterns.length, onPatternStep]);

  // Attach wheel as a non-passive listener so preventDefault actually works.
  // React 19 registers onWheel passively, which makes preventDefault a no-op
  // and logs "Unable to preventDefault inside passive event listener".
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div className="table-display">
      {/* Unified Data Grid */}
      <div
        ref={containerRef}
        className={`unified-table-container${patternsActive ? ' pattern-mode' : ''}`}
        onMouseLeave={() => handleRowHover(null)}
      >
        {/* External headers as first row */}
        <div className="unified-table-row external-headers-row" style={{ gridTemplateColumns: gridColumns }}>
          {/* Frontex Jora Data - spans 4 columns */}
          <div className={`external-header-cell frontex-data-cell ${shouldHighlightFrontex ? 'guide-highlight' : ''}`} style={{ gridColumn: 'span 4' }}>
            <div className="data-tabs">
              <span className={` ${shouldHighlightIrini ? 'guide-highlight' : ''}`}>Authorities Data: Frontex /<span className="irini-data-title">EUNAVFOR Med Irini Data</span></span>
              {onGuideClick && (
                <GuideButton
                  onClick={() => { if (!patternsActive) onGuideClick('irini'); }}
                  ariaLabel="Show EUNAVFOR Med Irini Data guide"
                />
              )}
            </div>
          </div>
          {/* People pushed back - spans 4 columns */}
          <div className={`external-header-cell people-pushed-back-cell ${shouldHighlightPeoplePushedBack ? 'guide-highlight' : ''}`} style={{ gridColumn: 'span 4' }}>
            <span className="people-count">People pushed back, at least: {peoplePushedBackCount}</span>
            {onGuideClick && (
                    <GuideButton
                      onClick={() => { if (!patternsActive) onGuideClick('migrants-deterred'); }}
                      ariaLabel="Show migrant pushback guide"
                    />
                  )}
          </div>
          {/* Columnar headers */}
          {columnarDisplays.map((columnar, index) => (
            <div key={index} className={`external-header-cell flight-data-cell ${index === 0 && shouldHighlightFlightColumn ? 'guide-highlight' : ''}`}>
              {index === 0 && (
                <div className="flight-data-title">
                  <span>{columnar.props.title || 'Flight Data'}</span>
                  {onGuideClick && (
                    <GuideButton
                      onClick={() => { if (!patternsActive) onGuideClick('flight'); }}
                      ariaLabel="Show Flight Data guide"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Column Headers as second row */}
        <div ref={columnHeadersRef} className="unified-table-row column-headers-row" style={{ gridTemplateColumns: gridColumns }}>
          {mainColumns.map(key => {
            const columnTitle = getColumnTitle(key);

            // Guide highlighting for specific columns
            const shouldHighlightThisColumn =
              (shouldHighlightDetectionColumn && columnTitle === 'Detection Initiated by') ||
              (shouldHighlightDisembarkationColumn && columnTitle === 'Disembarkation') ||
              (shouldHighlightMigrantsColumn && columnTitle === 'Migrants deterred');

            return (
              <div
                key={key}
                className={`column-header ${toKebabCase(columnTitle)} ${shouldHighlightThisColumn ? 'guide-highlight-column' : ''}`}
              >
                {columnTitle}
              </div>
            );
          })}
          {columnarDisplays.map((columnar, index) => (
            <div key={index} className={`column-header columnar-header-cell ${shouldHighlightFlightColumn ? 'guide-highlight-column' : ''}`}>
              {columnar.props.columnHeader || 'Column'}
            </div>
          ))}
        </div>

        {sortedMainData.length === 0 ? (
          <div className="no-data">
            No data available for the selected criteria
          </div>
        ) : (
          <List
            className={`no-shadow-list main-data-body${patternsActive ? ' scroll-locked' : ''}`}
            listRef={listRef}
            defaultHeight={containerHeight}
            rowCount={sortedMainData.length}
            rowHeight={rowHeight}
            rowProps={itemData}
            overscanCount={5}
            rowComponent={VirtualizedTableRow}
            onScroll={handleScroll}
          />
        )}
      </div>
    </div>
  );
};

export default TableDisplay;
