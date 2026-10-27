import { create } from 'zustand';

const usePatternStore = create((set, get) => ({
  // State
  activePatterns: [], // Array of pattern keys (e.g., ['violence', 'selective-comms'])
  activeViolationIndex: 0, // Index of the currently active violation

  // Actions
  togglePattern: (key) => {
    const { activePatterns } = get();
    // Toggling a pattern from the panel restarts navigation at the first
    // violation. (Dot clicks use setActivePatterns instead, which preserves the
    // clicked violation's index.)
    if (activePatterns.includes(key)) {
      // Remove the pattern if it's already active
      set({ activePatterns: activePatterns.filter(k => k !== key), activeViolationIndex: 0 });
    } else {
      // Add the pattern if it's not active
      set({ activePatterns: [...activePatterns, key], activeViolationIndex: 0 });
    }
  },

  // Replace the active pattern set outright. Order matters: index 0 is coloured
  // red, 1 orange, 2 yellow (see getPatternColor), so callers pass the keys in
  // selection order — topmost pattern first.
  setActivePatterns: (keys) => {
    set({ activePatterns: keys });
  },

  clearPatterns: () => {
    set({ activePatterns: [], activeViolationIndex: 0 });
  },

  setActiveViolationIndex: (index) => {
    set({ activeViolationIndex: index });
  }
}));

export default usePatternStore;
