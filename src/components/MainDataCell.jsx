
/**
 * Get the CSS class name for a column
 */
const getColumnClassName = (column) => {
  return column.toLowerCase().replace(/([A-Z])/g, '-$1') + '-cell';
};

/**
 * Calculate cell background color based on hover and highlight states
 */
const getCellBackgroundColor = (
  isInHoveredDateGroup,
  hoverColor,
  shouldHighlightMainData,
  column,
  shouldHighlightDetectionColumn,
  shouldHighlightDisembarkationColumn,
  shouldHighlightMigrantsColumn
) => {
  if (isInHoveredDateGroup && hoverColor) {
    return hoverColor;
  }
  if (shouldHighlightMainData) {
    return 'var(--Yellow)';
  }
  if (column === 'detectionInitiated' && shouldHighlightDetectionColumn) {
    return 'var(--Yellow)';
  }
  if (column === 'disembarkation' && shouldHighlightDisembarkationColumn) {
    return 'var(--Yellow)';
  }
  if (column === 'migrantsDetered' && shouldHighlightMigrantsColumn) {
    return 'var(--Yellow)';
  }
  if (column === 'date') {
    return 'var(--white)';
  }
  return undefined;
};

/**
 * Renders a cell in the main JORA data group
 */
const MainDataCell = ({
  column,
  item,
  isFirstCell,
  isLastCell,
  isInHoveredDateGroup,
  hoverColor,
  shouldHighlightMainData,
  shouldHighlightDetectionColumn,
  shouldHighlightDisembarkationColumn,
  shouldHighlightMigrantsColumn,
  patternsActive,
  allViolationDates,
  onViolationDotClick
}) => {
  const backgroundColor = getCellBackgroundColor(
    isInHoveredDateGroup,
    hoverColor,
    shouldHighlightMainData,
    column,
    shouldHighlightDetectionColumn,
    shouldHighlightDisembarkationColumn,
    shouldHighlightMigrantsColumn
  );

  // Base className parts
  const classNameParts = ['unified-table-cell'];

  // Column-specific classes
  if (column === 'date') {
    classNameParts.push('date-cell');
  } else if (column === 'migrantsDetered') {
    classNameParts.push('migrants-overlay');
  } else {
    classNameParts.push(getColumnClassName(column));
  }

  // Position classes
  if (isFirstCell) classNameParts.push('first-in-jora-group');
  if (isLastCell) classNameParts.push('last-in-jora-group');

  // Irini rows render in purple with no ID shown
  if (item.source === 'irini') classNameParts.push('irini-row-cell');

  // Render cell content based on column type
  let content;
  if (column === 'date') {
    const violationDate = item.originalDate ?? item.dateGroup;
    const showHollowDot = !patternsActive
      && item.isDateRow
      && allViolationDates?.has(violationDate);
    content = (
      <>
        {item.isDateRow ? item.date : ''}
        {showHollowDot && (
          <span
            className="violation-hollow-dot"
            onClick={(e) => {
              e.stopPropagation();
              onViolationDotClick?.(violationDate);
            }}
          />
        )}
      </>
    );
  } else if (column === 'migrantsDetered') {
    content = !item.isDateRow && item[column] > 0 ? item[column] : '';
  } else if (column === 'id' && item.source === 'irini') {
    content = ''; // Irini rows show no ID
  } else {
    content = item.isDateRow ? '' : item[column];
  }

  return (
    <div
      key={column}
      className={classNameParts.join(' ')}
      style={{ backgroundColor }}
    >
      {content}
    </div>
  );
};

export default MainDataCell;
