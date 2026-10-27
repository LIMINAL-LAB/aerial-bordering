/**
 * Build className string for the unified table row
 */
export const buildRowClassNames = (
  selectedRow,
  index,
  isInHoveredDateGroup,
  isFirstInGroup,
  isLastInGroup,
  hasFlightData
) => {
  const classes = ['unified-table-row'];

  if (selectedRow === index) classes.push('selected');
  if (isInHoveredDateGroup) classes.push('hovered');
  if (isInHoveredDateGroup && isFirstInGroup) classes.push('first-in-group');
  if (isInHoveredDateGroup && isLastInGroup) classes.push('last-in-group');
  if (isLastInGroup) classes.push('is-last-in-group');
  if (!hasFlightData) classes.push('no-adsb-data');

  return classes.join(' ');
};

/**
 * Build row data for synthesis display
 */
export const buildSynthesisRowData = (item, columnarProcessedData) => {
  const rowData = { tabular: item };
  columnarProcessedData.forEach((colData, colIndex) => {
    // Find matching columnar data by dateGroup instead of using index
    const matchingColData = colData.find(
      row => row.isDateRow && row.dateGroup === item.dateGroup
    );
    rowData[`column${colIndex + 1}`] = matchingColData;
  });
  return rowData;
};
