import BreakRow from './BreakRow';
import ViolationRow from './ViolationRow';
import MainDataCell from './MainDataCell';
import { buildRowClassNames, buildSynthesisRowData } from './virtualizedTableRowHelpers';

const VirtualizedTableRow = ({
  index,
  style,
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
  onMeasureHeight,
  patternsActive,
  allViolationDates,
  activeViolationDate,
  onViolationDotClick
}) => {
  const item = sortedMainData[index];

  // Handle break rows specially
  if (item.isBreakRow) {
    return <BreakRow style={style} breakId={item.breakId} gridColumns={gridColumns} />;
  }

  // Handle violation rows specially
  if (item.isViolationRow) {
    const violationColData = columnarProcessedData[0]?.find(
      (row) => row.isDateRow && row.dateGroup === item.dateGroup
    );

    const isActiveViolation = patternsActive && item.violation?.date === activeViolationDate;

    return (
      <ViolationRow
        style={style}
        violation={item.violation}
        matchedPatterns={item.matchedPatterns}
        assets={violationColData?.assets}
        mainColumnsCount={mainColumns.length}
        totalColumnsCount={mainColumns.length + columnarDisplays.length}
        gridColumns={gridColumns}
        onMeasureHeight={onMeasureHeight}
        patternsActive={patternsActive}
        isActiveViolation={isActiveViolation}
      />
    );
  }

  // Determine if we should highlight main data cells (Frontex Jora columns)
  const shouldHighlightMainData = guideTab === 'jora-data';
  const isInHoveredDateGroup = hoveredDateGroup && item.dateGroup === hoveredDateGroup;

  // Determine if this is the first/last row in the date group
  const isFirstInGroup = index === 0 || sortedMainData[index - 1]?.dateGroup !== item.dateGroup;
  const isLastInGroup = index === sortedMainData.length - 1 || sortedMainData[index + 1]?.dateGroup !== item.dateGroup;

  // Calculate if this date group has any ADSB/flight data
  const hasFlightData = columnarProcessedData.some(colData => {
    const matchingData = colData.find(
      row => row.isDateRow && row.dateGroup === item.dateGroup
    );
    return matchingData && matchingData.flighthours > 0;
  });

  const rowClassName = buildRowClassNames(
    selectedRow,
    index,
    isInHoveredDateGroup,
    isFirstInGroup,
    isLastInGroup,
    hasFlightData
  );

  return (
    <div
      style={{
        ...style,
        gridTemplateColumns: gridColumns,
      }}
      className={rowClassName}
      onClick={() => handleRowClick(item, index)}
      onMouseEnter={() => handleRowHover(index)}
    >
      {/* Row card wrapper - uses subgrid to maintain column alignment */}
      <div
        className={`row-card ${isInHoveredDateGroup ? 'hovered' : ''} ${isFirstInGroup && isInHoveredDateGroup ? 'first-in-group' : ''} ${isLastInGroup && isInHoveredDateGroup ? 'last-in-group' : ''}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'subgrid',
          gridColumn: hasFlightData
            ? `1 / span ${mainColumns.length + columnarDisplays.length}`
            : `1 / span ${mainColumns.length}`,
          background: isInHoveredDateGroup && hasFlightData && hoverColor ? hoverColor : undefined
        }}
      >
        {/* JORA data group - main data columns only */}
        <div
          className="jora-data-group"
          style={{
            gridColumn: `span ${mainColumns.length}`
          }}
        >
          {mainColumns.map((column, colIdx) => (
            <MainDataCell
              key={column}
              column={column}
              item={item}
              isFirstCell={colIdx === 0}
              isLastCell={colIdx === mainColumns.length - 1}
              isInHoveredDateGroup={isInHoveredDateGroup}
              hoverColor={hoverColor}
              shouldHighlightMainData={shouldHighlightMainData}
              shouldHighlightDetectionColumn={shouldHighlightDetectionColumn}
              shouldHighlightDisembarkationColumn={shouldHighlightDisembarkationColumn}
              shouldHighlightMigrantsColumn={shouldHighlightMigrantsColumn}
              patternsActive={patternsActive}
              allViolationDates={allViolationDates}
              onViolationDotClick={onViolationDotClick}
            />
          ))}
        </div>

        {/* Flight data group - columnar data columns (only when hasFlightData) */}
        {hasFlightData && (
          <div
            className="flight-data-group"
            style={{
              gridColumn: `span ${columnarDisplays.length}`
            }}
          >
            {columnarDisplays.map((columnar, colIndex) => {
              const colData = columnarProcessedData[colIndex].find(
                row => row.isDateRow && row.dateGroup === item.dateGroup
              );

              const cellBgColor = isInHoveredDateGroup && hoverColor
                ? hoverColor
                : shouldHighlightFlightColumn
                  ? 'var(--Yellow)'
                  : (colData && columnar.props.cellBackgroundColor ? columnar.props.cellBackgroundColor(colData) : undefined);

              const isLastCell = colIndex === columnarDisplays.length - 1;

              return (
                <div
                  key={colIndex}
                  className={`unified-table-cell aerial-asset-overlay ${isLastCell ? 'last-in-flight-group' : ''}`}
                  style={{ backgroundColor: cellBgColor }}
                >
                  {item.isDateRow && colData && columnar.props.getColumnValue ? columnar.props.getColumnValue(colData) : ''}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Synthesis overlay*/}
      {synthesizedDisplay && isInHoveredDateGroup && (
        <div
          className="synthesis-overlay"
          style={{ left: `calc(${mainColumns.length + columnarDisplays.length} * var(--nav-subcolumn-width))` }}
        >
          {synthesizedDisplay(buildSynthesisRowData(item, columnarProcessedData), hoverColor)}
        </div>
      )}
      </div>
    );
};

export default VirtualizedTableRow;
