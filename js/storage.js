// Simple local storage implementation for completed levels
// Saving/loading is now enabled.

const COMPLETED_LEVELS_KEY = 'eulerinYoluCompletedLevels';

/**
 * Gets the set of completed level indices from local storage.
 * @returns {Set<number>} A set of completed level indices.
 */
export function getCompletedLevels() {
  try {
    const storedData = localStorage.getItem(COMPLETED_LEVELS_KEY);
    if (storedData) {
      // localStorage stores strings, parse it back to an array, then to a Set
      const completedArray = JSON.parse(storedData);
      // Ensure all items are numbers
      if (Array.isArray(completedArray)) {
         return new Set(completedArray.filter(item => typeof item === 'number'));
      }
    }
  } catch (error) {
    console.error("Error loading completed levels from localStorage:", error);
  }
  // Return an empty set if no data or error
  return new Set();
}

/**
 * Saves the set of completed level indices to local storage.
 * @param {Set<number>} completedLevelsSet - The set of completed level indices.
 */
export function saveCompletedLevels(completedLevelsSet) {
  try {
    // Convert Set to Array for JSON stringification
    const completedArray = Array.from(completedLevelsSet);
    localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify(completedArray));
    console.log("Completed levels saved:", completedArray);
  } catch (error) {
    console.error("Error saving completed levels to localStorage:", error);
  }
}

/**
 * Marks a specific level as completed and saves the state.
 * @param {number} levelIndex - The index of the level to mark as completed.
 */
export function markLevelAsCompleted(levelIndex) {
    const completedLevelsSet = getCompletedLevels();
    if (!completedLevelsSet.has(levelIndex)) {
        completedLevelsSet.add(levelIndex);
        saveCompletedLevels(completedLevelsSet);
        console.log(`Level ${levelIndex} marked as completed.`);
    } else {
        console.log(`Level ${levelIndex} was already completed.`);
    }
}

// Optional: Function to clear all completed levels (for testing/debugging)
export function clearCompletedLevels() {
    try {
        localStorage.removeItem(COMPLETED_LEVELS_KEY);
        console.log("All completed levels cleared from localStorage.");
    } catch (error) {
        console.error("Error clearing completed levels from localStorage:", error);
    }
}
