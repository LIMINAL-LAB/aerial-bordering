import './TimelineBar.css';

/**
 * Get intensity class for a color prefix based on normalized value (0-1)
 * @param {string} colorPrefix - 'grey', 'blue', or 'purple'
 * @param {number} value - Normalized value between 0-1
 * @param {boolean} hasData - Whether data exists for this entry
 * @returns {string} CSS class like 'grey-3' or 'blue-5'
 */
const getIntensityClass = (colorPrefix, value, hasData) => {
  if (!hasData || value === 0) return `${colorPrefix}-0`;
  if (value < 0.2) return `${colorPrefix}-1`;
  if (value < 0.4) return `${colorPrefix}-2`;
  if (value < 0.6) return `${colorPrefix}-3`;
  if (value < 0.8) return `${colorPrefix}-4`;
  return `${colorPrefix}-5`;
};

/**
 * TimelineBar Component
 * Displays a single row in the timeline with side-by-side wide and blue bars.
 * The wide left segment is JORA (grey) in panels 0/1, or EUNAVFOR MED Irini
 * (purple) in panel 2 — chosen by the caller via `leftChannel`. Which measure
 * drives each channel is set by TIMELINE_GREY_METRIC, TIMELINE_BLUE_METRIC and
 * TIMELINE_PURPLE_METRIC in src/constants.js. The narrow blue segment (air/ADS-B)
 * is unchanged in every panel.
 * Color intensity based on normalized values (0-1)
 * No hover effects or tooltips - purely visual
 */
function TimelineBar({ normalizedGrey, normalizedBlue, normalizedPurple, hasData, leftChannel = 'grey' }) {
  const leftValue = leftChannel === 'purple' ? normalizedPurple : normalizedGrey;
  const leftClass = getIntensityClass(leftChannel, leftValue, hasData);
  const blueClass = getIntensityClass('blue', normalizedBlue, hasData);

  return (
    <div className="timeline-bar">
      <div className={`timeline-bar__segment timeline-bar__segment--grey ${leftClass}`} />
      <div className={`timeline-bar__segment timeline-bar__segment--blue ${blueClass}`} />
    </div>
  );
}

export default TimelineBar;
