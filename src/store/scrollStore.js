import { create } from 'zustand';
import { ROW_HEIGHT } from '../constants';

// Helper function to calculate people pushed back count
const calculatePeoplePushedBackCount = (scrollOffset, sortedMainData) => {
  // Calculate which row index is at the top of the viewport
  const topVisibleRowIndex = Math.floor(scrollOffset / ROW_HEIGHT);

  // Sum migrants deterred from all data rows above the viewport
  let count = 0;
  for (let i = 0; i < topVisibleRowIndex && i < sortedMainData.length; i++) {
    const row = sortedMainData[i];
    // Only count data rows (not date header rows), and skip rows the frontex-data
    // pipeline flagged as same-day duplicates (same boat type and count)
    if (!row.isDateRow && !row.duplicate && row.migrantsDetered) {
      count += row.migrantsDetered;
    }
  }

  return count;
};

const useScrollStore = create((set, get) => ({
  // Data stores
  scrollOffset: 0,
  sortedMainData: [],
  peoplePushedBackCount: 0,

  // Actions
  setScrollOffset: (scrollOffset) => {
    const { sortedMainData } = get();
    const peoplePushedBackCount = calculatePeoplePushedBackCount(scrollOffset, sortedMainData);

    set({ scrollOffset, peoplePushedBackCount });
  },

  setSortedMainData: (sortedMainData) => {
    const { scrollOffset } = get();
    const peoplePushedBackCount = calculatePeoplePushedBackCount(scrollOffset, sortedMainData);

    set({ sortedMainData, peoplePushedBackCount });
  }
}));

export default useScrollStore;
