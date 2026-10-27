import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import "./DatabasePage.css";
import VerticalTimeline from "./VerticalTimeline";
import TableDisplay from "./TableDisplay";
import GuidePanel from "./GuidePanel";
import PatternsPanel from "./PatternsPanel";
import IdentifiedAircraft from "./IdentifiedAircraft";
import WidthWarning from "./WidthWarning";
import { mainData, flightData, titleMap, coreData } from "../data/databaseData";
import violationsData from "../data/violations.json";
import patternsData from "../data/patterns.json";
import usePatternStore from "../store/patternStore";
import { parseDatabaseSearch, buildDatabaseSearch } from "../utils/databaseUrlState";
import {
  processTimelineData,
  buildDateToRowMap,
  buildTimelinePanels,
  getPanelPositionFromTableScroll,
  getPanelPositionForDate,
  getWeekAtPanelPosition,
  getTableOffsetForWeek,
  getBreakScrollOffsets,
  getViolationScrollOffsets
} from "../utils/timelineDataUtils";
import { ROW_HEIGHT } from "../constants";

// Pixels scrolled per wheel/arrow step while moving through a tall violation card.
const INTRA_CARD_STEP = 120;
// Moving to another card needs this much extra scroll past the card's edge, in one
// continuous gesture, so reaching the end of a card does not carry on into the next.
const CARD_CHANGE_THRESHOLD = 100;
// Pulls this soon after the last in-card scroll are ignored (ms).
const EDGE_LOCK_MS = 250;
// Wheel events further apart than this (ms) count as a new gesture.
const GESTURE_GAP_MS = 200;
// After changing card, further changes are ignored for this long (ms), which also
// swallows trackpad momentum from the gesture that triggered the change.
const CARD_CHANGE_COOLDOWN_MS = 650;
const INITIAL_SCROLL_DATE = "2021-04-30";

const DatabasePage = () => {
  const [selectedRow, setSelectedRow] = useState(null);
  // Scroll indicator position within the gapped timeline: { panel, ratio } | null.
  const [scrollPosition, setScrollPosition] = useState(null);
  // Live table scroll offset (px), used to drive wheel-scrolling from the timeline.
  const [currentScrollOffset, setCurrentScrollOffset] = useState(0);
  const [maxScrollOffset, setMaxScrollOffset] = useState(0);
  const [scrollRequest, setScrollRequest] = useState({ offset: 0, counter: 0 });
  const [activeGuideSection, setActiveGuideSection] = useState(null);
  const [guideTab, setGuideTab] = useState(null);
  const [flatTableData, setFlatTableData] = useState([]);
  const [measuredViolationHeights, setMeasuredViolationHeights] = useState({});
  const [tableContainerHeight, setTableContainerHeight] = useState(0);

  // How far the active violation card is currently scrolled past its top, in px.
  // Non-zero only while a card taller than the viewport is being scrolled
  // through before the next/previous violation is snapped to.
  const intraCardScrollRef = useRef(0);
  // Timing state for the edge-of-card checks in handlePatternStep.
  const edgePullRef = useRef({ amount: 0, dir: 0, last: 0 });
  const lastCardChangeRef = useRef(0);
  const lastIntraScrollRef = useRef(0);

  const allViolationDates = useMemo(
    () => new Set(violationsData.map((v) => v.date)),
    []
  );

  const { activePatterns, activeViolationIndex, setActiveViolationIndex, setActivePatterns } = usePatternStore();

  // Deep-link support: /database?pattern=<key>[,<key>...]&case=<id> pre-activates those
  // patterns and lands on that case. Callers include the report's three pattern subsections
  // (see airborne-splash-r3rd), always with a single key and no case; the store is
  // module-level, so a pattern set or index left over from a previous navigation would
  // otherwise survive and land the reader partway down (or on the wrong list for) the new
  // selection.
  const [searchParams, setSearchParams] = useSearchParams();
  // Both the read effects below and the write effect further down look at this one
  // string, so the two directions can compare against a single source of truth.
  const currentSearch = searchParams.toString();

  // Applies ?pattern=... to the store. Only writes when the parsed list actually differs
  // from the current activePatterns (element-wise, order matters — order drives
  // getPatternColor) so that once the write effect below starts writing activePatterns back
  // to the URL, this effect won't immediately fire again and fight that write.
  useEffect(() => {
    const { patterns } = parseDatabaseSearch(currentSearch);
    const same =
      patterns.length === activePatterns.length &&
      patterns.every((key, i) => key === activePatterns[i]);
    if (!same) {
      setActivePatterns(patterns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearch]);

  // Rank each pattern by its declared order so a violation's patterns can be
  // sorted topmost-first (order 1 = "Selective Comms" = selected first = red).
  const patternOrder = useMemo(() => {
    const map = {};
    patternsData.forEach((p) => { map[p.key] = p.order; });
    return map;
  }, []);

  // Clicking a violation dot in the main table opens pattern mode with every
  // pattern tied to that violation active, ordered topmost-first, and snaps to
  // the clicked violation.
  const handleViolationDotClick = useCallback((date) => {
    const dayViolations = violationsData.filter((v) => v.date === date);
    const keys = Array.from(new Set(dayViolations.flatMap((v) => v.patterns || [])));
    if (keys.length === 0) return;

    const ordered = [...keys].sort(
      (a, b) => (patternOrder[a] ?? Infinity) - (patternOrder[b] ?? Infinity)
    );
    setActivePatterns(ordered);

    // Mirror the activeViolations derivation to locate the clicked violation's
    // index within the set that pattern mode will show.
    const newActive = Array.from(
      new Map(
        violationsData
          .filter((v) => v.patterns && v.patterns.some((p) => ordered.includes(p)))
          .map((v) => [v.id, v])
      ).values()
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
    const idx = newActive.findIndex((v) => v.date === date);
    intraCardScrollRef.current = 0;
    setActiveViolationIndex(idx < 0 ? 0 : idx);
  }, [patternOrder, setActivePatterns, setActiveViolationIndex]);

  // Process timeline data (chronological with gaps)
  const { items: timelineItems } = useMemo(() => {
    return processTimelineData(coreData);
  }, []);

  // Split the continuous weekly items into three gapped panels (JORA datasets).
  const panels = useMemo(() => buildTimelinePanels(timelineItems), [timelineItems]);

  // Build date-to-row mapping from flat table data
  const dateToRowMap = useMemo(() => {
    return buildDateToRowMap(flatTableData);
  }, [flatTableData]);

  // The earliest years are sparse, so open on the first row at or after this date
  // instead of the very top. Deep links (?pattern / ?case) keep their own landing spot.
  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (initialScrollDoneRef.current) return;
    const dates = Object.keys(dateToRowMap);
    if (dates.length === 0) return;
    initialScrollDoneRef.current = true;
    if (parseDatabaseSearch(currentSearch).patterns.length > 0) return;
    const target = dates
      .filter((d) => d >= INITIAL_SCROLL_DATE)
      .sort()[0];
    if (target === undefined) return;
    setScrollRequest((prev) => ({
      offset: dateToRowMap[target] * ROW_HEIGHT,
      counter: prev.counter + 1,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateToRowMap]);

  // Compute active violations based on selected patterns
  const activeViolations = useMemo(() => {
    if (activePatterns.length === 0) return [];

    // Filter violations that have at least one of the active patterns
    const filtered = violationsData.filter((violation) => {
      return violation.patterns && violation.patterns.some((pattern) =>
        activePatterns.includes(pattern)
      );
    });

    // Dedupe by id and sort by date ascending
    const deduped = Array.from(
      new Map(filtered.map((v) => [v.id, v])).values()
    );

    return deduped.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [activePatterns]);

  // Last location.search whose ?case=... has already been resolved into
  // activeViolationIndex, so a later, unrelated activeViolations change (e.g. a violation-dot
  // click) doesn't re-run this and clobber that later selection.
  const resolvedCaseSearchRef = useRef(null);

  // Resolves ?case=<id> to an index into activeViolations. This has to be a *second* effect,
  // separate from the one above: activeViolations is derived from activePatterns, so right
  // after the effect above calls setActivePatterns it hasn't recomputed yet, and searching it
  // here would race that update (and, on the very first run after a fresh page load, race
  // whatever pattern set the store happened to start with). Waiting until the parsed pattern
  // list matches the store's current activePatterns is how this effect knows activeViolations
  // has settled to the set the URL asked for. Declared before the clamp effect below so a
  // resolved index lands first and the clamp only ever sees an already-valid index.
  useEffect(() => {
    if (resolvedCaseSearchRef.current === currentSearch) return;

    const { patterns, caseId } = parseDatabaseSearch(currentSearch);
    const patternsSettled =
      patterns.length === activePatterns.length &&
      patterns.every((key, i) => key === activePatterns[i]);
    if (!patternsSettled) return;

    resolvedCaseSearchRef.current = currentSearch;

    const idx = activeViolations.findIndex((v) => v.id === caseId);
    // A deep link lands on a card top, as handlePatternSeek does (see below). No match —
    // including caseId === null, i.e. a pattern-only link — falls back to the first case, NOT
    // to the clamp effect below (that effect's last-case fallback is for a shrinking active
    // set, the wrong end of the list for an incoming link).
    intraCardScrollRef.current = 0;
    setActiveViolationIndex(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearch, activeViolations]);

  // Clamp activeViolationIndex to valid range
  useEffect(() => {
    if (activePatterns.length > 0 && activeViolations.length > 0) {
      const clampedIndex = Math.max(0, Math.min(activeViolationIndex, activeViolations.length - 1));
      if (clampedIndex !== activeViolationIndex) {
        setActiveViolationIndex(clampedIndex);
      }
    }
  }, [activeViolationIndex, activeViolations.length, activePatterns.length, setActiveViolationIndex]);

  // Writes the store's pattern/case selection back into the URL, so the address bar (and
  // therefore a copied link) stays live as the reader toggles patterns or steps between
  // cases. This is the single writer described in airborne-splash-yjdz — nothing else calls
  // setSearchParams. caseId is passed as null when sitting on the first case so a bare
  // ?pattern=<key> link (see airborne-splash-r3rd) doesn't immediately grow a &case= the
  // instant it's followed; the read effect above already falls back to index 0 when case is
  // absent, so this round-trips.
  //
  // This can't ping-pong with the two read effects above: a write here changes currentSearch,
  // which re-runs both read effects, but the pattern-read effect finds patterns unchanged (we
  // built the string from the same activePatterns) and no-ops, and the case-resolution effect
  // resolves caseId back to this same activeViolationIndex and calls setActiveViolationIndex
  // with the value it already holds — which changes no dependency this effect (or either read
  // effect) watches, so nothing re-fires. And a URL navigation that changes currentSearch
  // first runs the read effects to update the store, which then runs this effect — but it
  // rebuilds the same string the URL already has, the equality check below fires, and it
  // returns without writing.
  //
  // It must NOT write while its closed-over state is behind the store, though. React flushes
  // every effect of a commit before re-rendering, so on the mount pass this one still sees the
  // render-1 activePatterns ([] on a fresh mount) even though the pattern-read effect above has
  // already pushed the URL's patterns into the store. Writing then would clear an incoming
  // ?pattern=<key> deep link (the report's three pattern subsections, airborne-splash-r3rd) and
  // the read effect would parse that emptied search right back into the store, landing the
  // reader on a bare /database. The same goes for activeViolationIndex and the case-resolution
  // effect above, which would cost an incoming &case=<id>.
  //
  // So compare the closure against the live store and bail when they differ: that store update
  // has already scheduled a re-render, which re-runs this effect with values that match. A
  // check against the store (not a first-run ref) is also what makes this correct under
  // StrictMode, whose dev-only mount/unmount/remount replays this effect with the same stale
  // render-1 closure — the ref guard it would have consumed on the first pass.
  useEffect(() => {
    const live = usePatternStore.getState();
    const patternsInSync =
      live.activePatterns.length === activePatterns.length &&
      live.activePatterns.every((key, i) => key === activePatterns[i]);
    if (!patternsInSync || live.activeViolationIndex !== activeViolationIndex) return;

    const caseId = activeViolationIndex === 0
      ? null
      : activeViolations[activeViolationIndex]?.id ?? null;
    const built = buildDatabaseSearch({ patterns: activePatterns, caseId });
    if (built === searchParams.toString()) return;
    setSearchParams(built, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePatterns, activeViolations, activeViolationIndex]);

  // How far a violation card overflows the viewport (0 if it fits).
  const getCardOverflow = useCallback((violation) => {
    if (!violation?.id || !tableContainerHeight) return 0;
    const cardHeight = measuredViolationHeights[violation.id];
    if (!cardHeight) return 0;
    return Math.max(0, cardHeight - tableContainerHeight);
  }, [measuredViolationHeights, tableContainerHeight]);

  // Snap-scroll to current violation when index changes (only when patterns are active)
  useEffect(() => {
    if (activePatterns.length > 0 && activeViolations.length > 0 && activeViolationIndex >= 0 && activeViolationIndex < activeViolations.length) {
      const currentViolation = activeViolations[activeViolationIndex];
      if (currentViolation?.date) {
        // Scroll table to violation
        const violationOffsets = getViolationScrollOffsets(flatTableData, ROW_HEIGHT, measuredViolationHeights);
        const targetOffset = violationOffsets[currentViolation.date];
        if (targetOffset !== undefined) {
          // Preserve any intra-card scroll (e.g. entering a tall card from the
          // bottom lands at base + overflow) rather than always the card top.
          // Clamp it to what the card currently overflows by: the ref is an
          // absolute pixel offset, and a card's measured height changes as its
          // images decode, so an offset taken against the old height would
          // scroll straight past the card into the struck-out rows below it.
          const intra = Math.min(intraCardScrollRef.current, getCardOverflow(currentViolation));
          intraCardScrollRef.current = intra;
          setScrollRequest(prev => ({ offset: targetOffset + intra, counter: prev.counter + 1 }));
        }

        // Move the scroll indicator to the violation's panel position.
        const position = getPanelPositionForDate(panels, currentViolation.date);
        if (position) {
          setScrollPosition(position);
        }
      }
    }
  }, [activeViolationIndex, activeViolations, flatTableData, panels, activePatterns.length, measuredViolationHeights, getCardOverflow]);

  // Handle wheel/arrow stepping through violations (only when patterns active).
  // When the active card is taller than the viewport, scroll through it first
  // and only advance to the next/previous violation once its edge is reached.
  // `delta` is a raw scroll amount (wheel deltaY, or ±INTRA_CARD_STEP for arrow
  // keys): its magnitude drives smooth intra-card scrolling, its sign the step.
  const handlePatternStep = useCallback((delta) => {
    if (activePatterns.length === 0 || activeViolations.length === 0) return;
    const dir = Math.sign(delta);
    if (dir === 0) return;

    const current = activeViolations[activeViolationIndex];
    const overflow = getCardOverflow(current);
    const violationOffsets = getViolationScrollOffsets(flatTableData, ROW_HEIGHT, measuredViolationHeights);
    const baseOffset = current?.date != null ? violationOffsets[current.date] : undefined;

    const now = performance.now();
    if (overflow > 0 && baseOffset !== undefined) {
      // Clamped for the same reason as the snap effect above: the card may have
      // grown or shrunk since this offset was taken.
      const intra = Math.min(intraCardScrollRef.current, overflow);
      if (dir > 0 && intra < overflow) {
        const next = Math.min(overflow, intra + Math.abs(delta));
        intraCardScrollRef.current = next;
        lastIntraScrollRef.current = now;
        setScrollRequest(prev => ({ offset: baseOffset + next, counter: prev.counter + 1 }));
        return;
      }
      if (dir < 0 && intra > 0) {
        const next = Math.max(0, intra - Math.abs(delta));
        intraCardScrollRef.current = next;
        lastIntraScrollRef.current = now;
        setScrollRequest(prev => ({ offset: baseOffset + next, counter: prev.counter + 1 }));
        return;
      }
    }

    const newIndex = Math.max(0, Math.min(activeViolationIndex + dir, activeViolations.length - 1));
    if (newIndex === activeViolationIndex) return;

    // At the card's edge: change card only after a deliberate extra pull in the same
    // direction. Blocked events never extend the locks below, so they always expire.
    if (now - lastIntraScrollRef.current < EDGE_LOCK_MS) return;
    if (now - lastCardChangeRef.current < CARD_CHANGE_COOLDOWN_MS) return;
    const pull = edgePullRef.current;
    const continuing = pull.dir === dir && now - pull.last < GESTURE_GAP_MS;
    const amount = (continuing ? pull.amount : 0) + Math.abs(delta);
    edgePullRef.current = { amount, dir, last: now };
    if (amount < CARD_CHANGE_THRESHOLD) return;
    lastCardChangeRef.current = now;
    // Enter the next card from its top (scrolling down) or bottom (scrolling up).
    intraCardScrollRef.current = dir < 0 ? getCardOverflow(activeViolations[newIndex]) : 0;
    setActiveViolationIndex(newIndex);
  }, [activePatterns.length, activeViolations, activeViolationIndex, flatTableData, measuredViolationHeights, getCardOverflow, setActiveViolationIndex]);

  // Arrow key navigation through active violations
  useEffect(() => {
    if (activePatterns.length === 0) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handlePatternStep(INTRA_CARD_STEP);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePatternStep(-INTRA_CARD_STEP);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePatterns.length, handlePatternStep]);

  // Handle timeline click/drag to seek to nearest violation
  const handlePatternSeek = useCallback((index) => {
    if (activePatterns.length > 0 && activeViolations.length > 0) {
      const clampedIndex = Math.max(0, Math.min(index, activeViolations.length - 1));
      if (clampedIndex !== activeViolationIndex) {
        // Seeking jumps to a card top, so drop any in-card scroll.
        intraCardScrollRef.current = 0;
        setActiveViolationIndex(clampedIndex);
      }
    }
  }, [activePatterns.length, activeViolations.length, activeViolationIndex, setActiveViolationIndex]);

  const getDataKeys = (data) => {
    if (!data || typeof data !== 'object') return [];

    // Find the first non-empty array to extract column names
    for (const value of Object.values(data)) {
      if (value && Array.isArray(value) && value.length > 0) {
        // `duplicate` is a counting flag from the pipeline, not a column
        return Object.keys(value[0]).filter((key) => key !== 'duplicate');
      }
    }

    return [];
  };

  const getColumnTitle = (key) => {
    return titleMap[key] || key;
  };

  const mainDataKeys = ['date', ...getDataKeys(mainData)];

  const handleRowSelect = (item, index) => {
    setSelectedRow(index === selectedRow ? null : index);
  };

  const handleDataChange = (sortedData) => {
    setFlatTableData(sortedData);
  };

  const handleTableScroll = (offset, _ratio, maxOffset) => {
    setMaxScrollOffset(maxOffset);
    setCurrentScrollOffset(offset);

    // Only update the indicator from table scroll when no patterns are active;
    // when patterns are active the snap effect controls the timeline position.
    // The indicator lives in whichever panel the table is currently within.
    if (activePatterns.length === 0) {
      setScrollPosition(
        getPanelPositionFromTableScroll(panels, flatTableData, offset, ROW_HEIGHT)
      );
    }
  };

  // Wheel-scrolling over the timeline scrolls the table to an absolute offset.
  const handleScrollToOffset = (offset) => {
    setScrollRequest(prev => ({ offset, counter: prev.counter + 1 }));
  };

  // Clicking/dragging within a panel maps to that panel's date range only.
  const handleSeekPanel = (panelIndex, ratio) => {
    const week = getWeekAtPanelPosition(panels[panelIndex], ratio);
    const targetOffset = getTableOffsetForWeek(week, dateToRowMap, ROW_HEIGHT);
    if (targetOffset == null) return;
    setScrollRequest(prev => ({ offset: targetOffset, counter: prev.counter + 1 }));
  };

  const breakOffsets = useMemo(
    () => getBreakScrollOffsets(flatTableData, ROW_HEIGHT),
    [flatTableData]
  );

  const handleBreakClick = (breakId) => {
    const offset = breakOffsets[breakId];
    if (offset == null) return;
    setScrollRequest(prev => ({ offset, counter: prev.counter + 1 }));
  };

  const handleGuideClick = (section) => {
    setActiveGuideSection(section);
  };

  const handleGuideClose = () => {
    setActiveGuideSection(null);
  };

  const handleGuideStateChange = (tab) => {
    setGuideTab(tab);
  };

  // Function to get hover color based on rowData
  const getCellHoverColor = (rowData) => {
    if (rowData.column1) {
      const color = getCellBackgroundColor(rowData.column1);
      return color;
    }
    return undefined; // fallback color when no ADSB data
  };

  // Function to generate synthesized display text
  const getSynthesizedDisplay = (rowData, hoverColor) => {
    const { tabular, column1 } = rowData;

    // Show only on date row (top of group)
    if (!tabular || !tabular.isDateRow) return '';

    // A date with no ADS-B row at all is still a date with no aerial data, so
    // it reaches the component too and gets the placeholder.
    return <IdentifiedAircraft assets={column1?.assets} />;
  };

  const formatFlightHours = (item) => {
    if (item && item.isDateRow && item.flighthours !== undefined && item.flighthours !== null) {
      const n = item.flighthours;
      const amt = n > 0 && n < 1 ? Math.ceil(n) : Math.round(n);
      return `${amt}h`;
    }
    return '';
  };

  const getCellBackgroundColor = (rowData) => {
    if (rowData.cellColor) {
      return rowData.cellColor;
    }

    // Calculate gradient based on flighthours/maxflighthours ratio
    if (rowData.flighthours !== undefined && rowData.maxflighthours !== undefined && rowData.maxflighthours > 0) {
      const ratio = rowData.flighthours / rowData.maxflighthours;

      // Light blue RGB: #f8f9ff (248, 249, 255)
      // Dark blue RGB: #6F8CF5 (111, 140, 245)
      const lightBlue = { r: 248, g: 249, b: 255 };
      const darkBlue = { r: 111, g: 140, b: 245 };

      // Interpolate between light and dark blue based on ratio
      const r = Math.round(lightBlue.r + (darkBlue.r - lightBlue.r) * ratio);
      const g = Math.round(lightBlue.g + (darkBlue.g - lightBlue.g) * ratio);
      const b = Math.round(lightBlue.b + (darkBlue.b - lightBlue.b) * ratio);

      return `rgb(${r}, ${g}, ${b})`;
    }

    // Default fallback - when there's no ADSB data
    return 'var(grey-shade-1)';
  };

  return (
    <div className="database-page">
      <WidthWarning />
      <div className="database-container">
        <div className="patterns-column">
          <PatternsPanel onGuideClick={handleGuideClick} guideTab={guideTab} />
        </div>
        <div className="timeline-column">
          <VerticalTimeline
            scrollPosition={scrollPosition}
            currentScrollOffset={currentScrollOffset}
            maxScrollOffset={maxScrollOffset}
            onScrollToOffset={handleScrollToOffset}
            onSeekPanel={handleSeekPanel}
            onGuideClick={handleGuideClick}
            onBreakClick={handleBreakClick}
            panels={panels}
            guideTab={guideTab}
            violations={violationsData}
            activePatterns={activePatterns}
            onPatternStep={handlePatternStep}
            onPatternSeek={handlePatternSeek}
            activeViolations={activeViolations}
          />
        </div>
        <div className="tables-section">
          <TableDisplay
            mainData={mainData}
            mainColumns={mainDataKeys}
            mainProps={{
              getColumnTitle
            }}
            columnarDisplays={[
              {
                data: flightData,
                props: {
                  getColumnValue: formatFlightHours,
                  cellBackgroundColor: getCellBackgroundColor,
                  title: "Flight Data",
                  columnHeader: "Flight Time"
                }
              }
            ]}
            selectedRow={selectedRow}
            onRowSelect={handleRowSelect}
            cellHoverColor={getCellHoverColor}
            synthesizedDisplay={getSynthesizedDisplay}
            onScroll={handleTableScroll}
            scrollRequest={scrollRequest}
            onGuideClick={handleGuideClick}
            guideTab={guideTab}
            onDataChange={handleDataChange}
            onViolationHeightsChange={setMeasuredViolationHeights}
            allViolationDates={allViolationDates}
            activeViolations={activeViolations}
            activePatterns={activePatterns}
            activeViolationDate={activeViolations[activeViolationIndex]?.date ?? null}
            onPatternStep={handlePatternStep}
            onViolationDotClick={handleViolationDotClick}
            onContainerHeightChange={setTableContainerHeight}
          />
        </div>
      </div>
      <GuidePanel
        activeSection={activeGuideSection}
        onClose={handleGuideClose}
        onOpen={handleGuideClick}
        onGuideStateChange={handleGuideStateChange}
      />
    </div>
  );
};

export default DatabasePage;
