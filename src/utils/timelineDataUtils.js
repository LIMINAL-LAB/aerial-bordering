/**
 * Timeline Data Utilities
 * Processes timeline-data.json for visualization in VerticalTimeline
 * Generates chronological date array with gaps shown as empty bars
 */

import {
  ROW_HEIGHT,
  BREAK_1_AFTER_DATE,
  BREAK_2_AFTER_DATE,
  TIMELINE_GREY_METRIC,
  TIMELINE_BLUE_METRIC,
  TIMELINE_PURPLE_METRIC,
} from '../constants';

/**
 * The measures the timeline bars can display. `channel` fixes which colour
 * a metric is allowed in: grey reads the JORA (sea) side, blue the ADS-B (air)
 * side, purple the EUNAVFOR MED Irini side. "People pushed back" skips rows the
 * frontex-data pipeline flagged `duplicate` (same day, boat type and count).
 */
export const TIMELINE_METRICS = {
  boats:    { channel: 'grey', label: 'Boats spotted',      perDay: d => (Array.isArray(d?.jora) ? d.jora.length : 0) },
  people:   { channel: 'grey', label: 'People pushed back', perDay: d => (Array.isArray(d?.jora) ? d.jora.reduce((sum, r) => sum + (typeof r?.migrantsDetered === 'number' && !r.duplicate ? r.migrantsDetered : 0), 0) : 0) },
  hours:    { channel: 'blue', label: 'Flight hours',       perDay: d => d?.adsb?.flighthours || 0 },
  aircraft: { channel: 'blue', label: 'Aircraft (asset-days)', perDay: d => (Array.isArray(d?.adsb?.assets) ? d.adsb.assets.length : 0) },
  irini:    { channel: 'purple', label: 'Irini cases',      perDay: d => (Array.isArray(d?.irini) ? d.irini.length : 0) },
};

const METRIC_IDS = Object.keys(TIMELINE_METRICS);

/** Resolve a configured metric id, failing loudly on a typo or a wrong-channel choice. */
export function resolveMetric(id, channel) {
  const metric = TIMELINE_METRICS[id];
  if (!metric) {
    throw new Error(`Unknown timeline metric "${id}". Valid ids: ${METRIC_IDS.join(', ')}.`);
  }
  if (metric.channel !== channel) {
    const allowed = METRIC_IDS.filter(k => TIMELINE_METRICS[k].channel === channel);
    throw new Error(`Timeline metric "${id}" belongs to the ${metric.channel} channel, not ${channel}. Valid ${channel} ids: ${allowed.join(', ')}.`);
  }
  return metric;
}

/**
 * Generate array of all dates between start and end (inclusive)
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} endDate - ISO date string (YYYY-MM-DD)
 * @returns {string[]} Array of ISO date strings
 */
export function generateDateRange(startDate, endDate) {
  const dates = [];
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  while (current <= end) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, '0');
    const day = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Extract timeline data from the main dataset
 * @param {Object} timelineData - The timeline-data.json object (dates as keys)
 * @returns {Object[]} Array of timeline items with date, hasData, and one field
 *   per TIMELINE_METRICS id (boats, people, hours, aircraft)
 */
export function extractTimelineData(timelineData) {
  if (!timelineData || typeof timelineData !== 'object') {
    return [];
  }

  const dates = Object.keys(timelineData).sort();
  if (dates.length === 0) {
    return [];
  }

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  // Generate all dates in range (including gaps)
  const allDates = generateDateRange(firstDate, lastDate);

  // Map each date to its data. Every metric is read here, whether or not it is
  // the selected one, so aggregation and normalisation stay metric-agnostic.
  return allDates.map(date => {
    const dayData = timelineData[date];
    const item = { date, hasData: !!dayData }; // hasData: does this date exist in source data
    for (const id of METRIC_IDS) {
      item[id] = TIMELINE_METRICS[id].perDay(dayData);
    }
    return item;
  });
}

/**
 * Normalize values to 0-1 range for color intensity
 * @param {Object[]} timelineData - Array of timeline items
 * @returns {Object[]} Array with normalized values added
 */
export function normalizeTimelineData(timelineData) {
  if (!timelineData || timelineData.length === 0) {
    return [];
  }

  // Validates the configured ids, and refuses a metric put in the wrong channel.
  resolveMetric(TIMELINE_GREY_METRIC, 'grey');
  resolveMetric(TIMELINE_BLUE_METRIC, 'blue');
  resolveMetric(TIMELINE_PURPLE_METRIC, 'purple');

  // Linear against each metric's own global max, over weeks that have data.
  const maxOf = (id) => Math.max(
    ...timelineData.filter(d => d.hasData).map(d => d[id] || 0),
    1 // Minimum 1 to avoid division by zero
  );
  const maxGrey = maxOf(TIMELINE_GREY_METRIC);
  const maxBlue = maxOf(TIMELINE_BLUE_METRIC);
  const maxPurple = maxOf(TIMELINE_PURPLE_METRIC);

  return timelineData.map(item => ({
    ...item,
    normalizedGrey: (item[TIMELINE_GREY_METRIC] || 0) / maxGrey,
    normalizedBlue: (item[TIMELINE_BLUE_METRIC] || 0) / maxBlue,
    normalizedPurple: (item[TIMELINE_PURPLE_METRIC] || 0) / maxPurple,
  }));
}

/**
 * Get ISO week key for a date (format: YYYY-Www where ww is the week number)
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} Week key (e.g., "2022-W51")
 */
export function getWeekKey(dateStr) {
  const date = new Date(dateStr);

  // Get ISO week number (week 1 is the week with the first Thursday of the year)
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((date - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);

  const year = date.getFullYear();
  const paddedWeek = String(weekNum).padStart(2, '0');

  return `${year}-W${paddedWeek}`;
}

/**
 * Aggregate timeline data by week
 * @param {Object[]} timelineData - Array of timeline items (from extractTimelineData)
 * @returns {Object[]} Array of aggregated weekly items with summed values
 */
export function aggregateTimelineByWeek(timelineData) {
  if (!timelineData || timelineData.length === 0) {
    return [];
  }

  const weekMap = {};

  // Group dates into weeks and sum their values
  timelineData.forEach(item => {
    const weekKey = getWeekKey(item.date);

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { weekKey, dates: [], hasData: false };
      for (const id of METRIC_IDS) {
        weekMap[weekKey][id] = 0;
      }
    }

    weekMap[weekKey].dates.push(item.date);
    for (const id of METRIC_IDS) {
      weekMap[weekKey][id] += item[id];
    }
    weekMap[weekKey].hasData = weekMap[weekKey].hasData || item.hasData;
  });

  // Convert to array and sort by week key
  return Object.values(weekMap).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

/**
 * Group timeline data by year for year markers
 * @param {Object[]} timelineData - Array of normalized timeline items
 * @returns {Object} Object with years as keys, each containing { year, startIndex, itemCount }
 */
export function groupByYear(timelineData) {
  if (!timelineData || timelineData.length === 0) {
    return {};
  }

  const yearGroups = {};

  timelineData.forEach((item, index) => {
    // Handle both daily items (with .date) and weekly items (with .weekKey)
    const dateStr = item.date || item.weekKey;
    const year = dateStr ? dateStr.substring(0, 4) : null;

    if (!year) return;

    if (!yearGroups[year]) {
      yearGroups[year] = {
        year,
        startIndex: index,
        itemCount: 0,
        items: []
      };
    }

    yearGroups[year].itemCount++;
    yearGroups[year].items.push(item);
  });

  return yearGroups;
}

/**
 * Process complete timeline data pipeline with weekly aggregation
 * @param {Object} timelineData - The timeline-data.json object
 * @param {boolean} aggregateByWeek - Whether to aggregate by week (default: true)
 * @returns {Object} { items: normalized data array, yearGroups: year grouping object, totalItems: count }
 */
export function processTimelineData(timelineData, aggregateByWeek = true) {
  const extracted = extractTimelineData(timelineData);

  let processedData;
  if (aggregateByWeek) {
    // Aggregate by week, then normalize the aggregated values
    const aggregated = aggregateTimelineByWeek(extracted);
    processedData = normalizeTimelineData(aggregated);
  } else {
    // Use daily data
    processedData = normalizeTimelineData(extracted);
  }

  const yearGroups = groupByYear(processedData);

  return {
    items: processedData,
    yearGroups,
    totalItems: processedData.length,
    dateRange: processedData.length > 0
      ? {
          start: processedData[0].date || processedData[0].weekKey,
          end: processedData[processedData.length - 1].date || processedData[processedData.length - 1].weekKey
        }
      : null
  };
}

/**
 * Build a mapping of dates to their row indices in the table
 * This maps each date to the index of its DATE HEADER row
 * @param {Object[]} flatTableData - The flat table data array from TableDisplay
 * @returns {Object} Map of date -> row index
 */
export function buildDateToRowMap(flatTableData) {
  const dateToRowMap = {};

  flatTableData.forEach((row, index) => {
    // Only map date header rows (not child rows or break rows)
    if (row.isDateRow && row.date) {
      dateToRowMap[row.date] = index;
    }
  });

  return dateToRowMap;
}

/**
 * Find the date that corresponds to a given table row index
 * @param {Object[]} flatTableData - The flat table data array
 * @param {number} rowIndex - The row index in the table
 * @returns {string|null} The date for that row, or null
 */
export function getDateForTableRow(flatTableData, rowIndex) {
  if (!flatTableData || rowIndex < 0 || rowIndex >= flatTableData.length) {
    return null;
  }

  const row = flatTableData[rowIndex];

  // For date header rows, use the date
  if (row.isDateRow && row.date) {
    return row.date;
  }

  // For child rows or break rows, use the dateGroup/originalDate
  return row.dateGroup || row.originalDate || null;
}

/**
 * Pixel scroll offset of each break row's top. Mirrors src/store/scrollStore.js accumulation.
 * @param {Object[]} flatTableData - flat table rows (incl. break rows)
 * @param {number} rowHeight - normal row height (default ROW_HEIGHT)
 * @returns {Object} { 1: offsetPx, 2: offsetPx } for each breakId present
 */
export function getBreakScrollOffsets(flatTableData, rowHeight = ROW_HEIGHT) {
  const offsets = {};
  let cum = 0;
  for (const row of flatTableData || []) {
    if (row.isBreakRow) offsets[row.breakId] = cum;
    cum += row.isBreakRow ? (row.breakHeight ?? rowHeight) : rowHeight;
  }
  return offsets;
}

/**
 * Pixel scroll offset of each violation row's top. Mirrors src/store/scrollStore.js accumulation.
 * @param {Object[]} flatTableData - flat table rows (incl. violation rows)
 * @param {number} rowHeight - normal row height (default ROW_HEIGHT)
 * @returns {Object} { [date]: offsetPx } for each violation row present
 */
export function getViolationScrollOffsets(flatTableData, rowHeight = ROW_HEIGHT, measuredHeights = {}) {
  const offsets = {};
  let cum = 0;
  for (const row of flatTableData || []) {
    if (row.isViolationRow && row.violation?.date) {
      offsets[row.violation.date] = cum;
    }
    let height = rowHeight;
    if (row.isBreakRow) height = row.breakHeight ?? rowHeight;
    else if (row.isViolationRow) {
      const measured = row.violation?.id ? measuredHeights[row.violation.id] : undefined;
      height = measured ?? row.expandHeight ?? rowHeight;
    }
    cum += height;
  }
  return offsets;
}

/* ---------------------------------------------------------------------------
 * Gapped-panel model
 *
 * The timeline renders as three physically separate panels split at the two
 * JORA dataset boundaries (BREAK_1_AFTER_DATE, BREAK_2_AFTER_DATE), with a
 * large whitespace gap between them:
 *   - Panel 0: … → 2021-09-03   (JORA 1)
 *   - Panel 1: 2021-09-04 → 2023-01-25   (JORA 2)
 *   - Panel 2: 2023-01-26 → …   (post / JORA 3)
 *
 * Positions are "per-panel": each panel maps only to its own slice of the
 * table date range and the inter-panel gaps correspond to NO rows (dead
 * space). A position is therefore expressed as { panel, ratio } where ratio
 * (0–1) is the fraction WITHIN that panel, not the whole strip.
 * ------------------------------------------------------------------------- */

/** Which panel (0|1|2) a date belongs to. Break dates fall in the earlier panel. */
export function panelIndexForDate(dateStr) {
  if (!dateStr) return 0;
  if (dateStr <= BREAK_1_AFTER_DATE) return 0;
  if (dateStr <= BREAK_2_AFTER_DATE) return 1;
  return 2;
}

/**
 * Split the continuous weekly timeline items into three panels.
 * Each weekly item is assigned by its first date so a week straddling a break
 * falls into the earlier panel.
 * @param {Object[]} timelineItems - weekly items (each with a .dates array)
 * @returns {Object[]} three panels, each { items, startIndex, totalItems, yearGroups }
 */
export function buildTimelinePanels(timelineItems) {
  const panels = [0, 1, 2].map(() => ({ items: [], startIndex: -1 }));

  (timelineItems || []).forEach((item, index) => {
    const repDate = (item.dates && item.dates[0]) || item.date;
    const pi = panelIndexForDate(repDate);
    if (panels[pi].startIndex === -1) panels[pi].startIndex = index;
    panels[pi].items.push(item);
  });

  panels.forEach(p => {
    if (p.startIndex === -1) p.startIndex = 0;
    p.totalItems = p.items.length;
    // groupByYear over the panel slice yields panel-relative startIndex values.
    p.yearGroups = groupByYear(p.items);
  });

  return panels;
}

/**
 * Locate a date within the gapped panels.
 * @returns {{panel: number, ratio: number}|null} panel index + fraction within
 *   that panel (0–1), or null if the date is outside every panel.
 */
export function getPanelPositionForDate(panels, targetDate) {
  if (!panels || !targetDate) return null;
  for (let pi = 0; pi < panels.length; pi++) {
    const items = panels[pi].items;
    if (!items.length) continue;
    const idx = items.findIndex(w =>
      Array.isArray(w.dates) ? w.dates.includes(targetDate) : w.date === targetDate
    );
    if (idx === -1) continue;
    const week = items[idx];
    if (Array.isArray(week.dates) && week.dates.length) {
      const di = week.dates.indexOf(targetDate);
      const days = week.dates.length || 7;
      return { panel: pi, ratio: (idx + (di + 0.5) / days) / items.length };
    }
    return { panel: pi, ratio: idx / items.length };
  }
  return null;
}

/**
 * Panel position ({panel, ratio}) for the current table scroll offset. Used to
 * place the scroll indicator inside whichever panel the table is currently in.
 */
export function getPanelPositionFromTableScroll(panels, flatTableData, tableScrollTop, tableItemHeight) {
  if (!panels || !flatTableData || flatTableData.length === 0) return null;
  const rowIndex = Math.floor(tableScrollTop / tableItemHeight);
  const clamped = Math.max(0, Math.min(rowIndex, flatTableData.length - 1));
  const date = getDateForTableRow(flatTableData, clamped);
  return getPanelPositionForDate(panels, date);
}

/**
 * Weekly item at a click ratio (0–1) within a single panel.
 * @returns {Object|null} the weekly item, or null
 */
export function getWeekAtPanelPosition(panel, ratio) {
  const items = panel?.items;
  if (!items || items.length === 0) return null;
  const index = Math.floor(ratio * items.length);
  const clamped = Math.max(0, Math.min(index, items.length - 1));
  return items[clamped] || null;
}

/**
 * Table scroll offset for a weekly item, using the date-header row map.
 * Prefers the first date in the week that actually has a table row so weeks
 * whose first calendar day falls in a data gap still resolve.
 * @returns {number|null} pixel offset, or null if no date in the week maps
 */
export function getTableOffsetForWeek(week, dateToRowMap, tableItemHeight) {
  if (!week || !dateToRowMap) return null;
  const dates = Array.isArray(week.dates) ? week.dates : (week.date ? [week.date] : []);
  for (const d of dates) {
    const rowIndex = dateToRowMap[d];
    if (rowIndex !== undefined) return rowIndex * tableItemHeight;
  }
  return null;
}

/**
 * Violation dots grouped by panel, each positioned as a % within its panel.
 * @returns {Object[][]} one array of dots per panel (same shape as
 *   entries: { id, date, topPct, patterns })
 */
export function getPanelViolationDots(panels, violations) {
  return (panels || []).map(panel => {
    const items = panel.items;
    const total = items.length;
    if (!Array.isArray(violations) || total === 0) return [];
    const out = [];
    for (const v of violations) {
      if (!v?.date) continue;
      const wi = items.findIndex(w => Array.isArray(w.dates) && w.dates.includes(v.date));
      if (wi === -1) continue;
      const week = items[wi];
      const di = week.dates.indexOf(v.date);
      const days = week.dates.length || 7;
      const frac = (wi + (di + 0.5) / days) / total;
      out.push({ id: v.id ?? v.date, date: v.date, topPct: frac * 100, patterns: v.patterns });
    }
    return out;
  });
}
