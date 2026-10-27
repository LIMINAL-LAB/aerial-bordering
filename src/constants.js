/**
 * Application Constants
 * Centralized magic numbers and configuration values
 */

// Layout dimensions
export const HEADER_HEIGHT = 82; // external header (40px) + column header (42px)
export const ROW_HEIGHT = 40;

// Break row dimensions
export const BREAK_1_HEIGHT = 320; // 8 rows × 40px
export const BREAK_2_HEIGHT = 360; // 9 rows × 40px
export const VIOLATION_ROW_HEIGHT = 220; // Expansion row for violation details
export const VIOLATION_ROW_MEDIA_ALLOWANCE = 320; // Per-item height allowance: one unit for the image carousel, one per pdf/video

// Break dates - when section breaks occur in the data
export const BREAK_1_AFTER_DATE = '2021-09-03';
export const BREAK_2_AFTER_DATE = '2023-01-25';

// Timeline metrics — which measure drives each colour channel of the timeline bars.
// Grey is the sea/JORA side ('boats' | 'people'); blue is the air/ADS-B side
// ('hours' | 'aircraft'). Definitions live in TIMELINE_METRICS in
// src/utils/timelineDataUtils.js.
export const TIMELINE_GREY_METRIC = 'boats';
export const TIMELINE_BLUE_METRIC = 'hours';
// Purple is the post-Jan-2023 EUNAVFOR MED Irini side; only 'irini' is defined for it.
export const TIMELINE_PURPLE_METRIC = 'irini';
