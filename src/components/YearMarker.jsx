import './YearMarker.css';

/**
 * YearMarker Component
 * Renders a bordered year cell down the left edge of a timeline panel. The cell
 * spans its year's vertical extent within the panel; the label is set vertically
 * along the left edge. A year that spans a panel break is drawn as a box in
 * every panel it touches, but only labelled in its dominant panel.
 */
function YearMarker({ year, topPosition, heightPosition, showLabel = true }) {
  return (
    <div
      className="year-marker"
      style={{ top: `${topPosition}%`, height: `${heightPosition}%` }}
    >
      {showLabel && <div className="year-marker__label">{year}</div>}
    </div>
  );
}

export default YearMarker;
