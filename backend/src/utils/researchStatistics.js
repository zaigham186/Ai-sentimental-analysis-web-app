/**
 * Research Statistics Utility
 * Phase 7: Research Analytics & Reporting
 * 
 * CRITICAL PRINCIPLES:
 * - Descriptive statistics only (no inferential claims or p-values)
 * - Safe percentage calculation: percentage = (count / validTotal) * 100
 * - Division-by-zero protection (returns 0.00% if validTotal is 0)
 * - Missing values explicitly tracked and preserved (never coerced to 0 or negative)
 * - Standardized rounding (percentages to 2 decimals, scores to 2-4 decimals)
 */

/**
 * Safely rounds a number to specified decimal places
 * @param {number|null} value 
 * @param {number} decimals 
 * @returns {number|null}
 */
function round(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculates safe percentage based on valid total
 * @param {number} count 
 * @param {number} validTotal 
 * @param {number} decimals 
 * @returns {number}
 */
function calculateValidPercentage(count, validTotal, decimals = 2) {
  if (!validTotal || validTotal <= 0 || !count || count <= 0) {
    return 0.0;
  }
  return round((count / validTotal) * 100, decimals);
}

/**
 * Calculates frequency counts and valid percentages for categorical arrays
 * @param {Array<string|null>} items 
 * @param {Array<string>} expectedCategories 
 * @returns {Object} { counts, percentages, validTotal, missingCount }
 */
function calculateCategoricalDistribution(items, expectedCategories = []) {
  const counts = {};
  expectedCategories.forEach(cat => { counts[cat] = 0; });

  let validTotal = 0;
  let missingCount = 0;

  for (const item of items) {
    if (item === null || item === undefined || item === '') {
      missingCount++;
    } else {
      counts[item] = (counts[item] || 0) + 1;
      validTotal++;
    }
  }

  const percentages = {};
  for (const [key, count] of Object.entries(counts)) {
    percentages[key] = calculateValidPercentage(count, validTotal);
  }

  return {
    counts,
    percentages,
    validTotal,
    missingCount,
    totalItems: items.length
  };
}

/**
 * Calculates descriptive summary statistics for an array of numeric values
 * @param {Array<number|null>} numbers 
 * @returns {Object} { mean, median, min, max, validCount, missingCount }
 */
function calculateNumericSummary(numbers) {
  const validNumbers = numbers
    .filter(n => n !== null && n !== undefined && !isNaN(n))
    .map(Number)
    .sort((a, b) => a - b);

  const missingCount = numbers.length - validNumbers.length;

  if (validNumbers.length === 0) {
    return {
      mean: null,
      median: null,
      min: null,
      max: null,
      validCount: 0,
      missingCount
    };
  }

  const sum = validNumbers.reduce((acc, curr) => acc + curr, 0);
  const mean = round(sum / validNumbers.length, 2);

  // Median calculation
  const mid = Math.floor(validNumbers.length / 2);
  const median = validNumbers.length % 2 === 0
    ? round((validNumbers[mid - 1] + validNumbers[mid]) / 2, 2)
    : round(validNumbers[mid], 2);

  const min = round(validNumbers[0], 2);
  const max = round(validNumbers[validNumbers.length - 1], 2);

  return {
    mean,
    median,
    min,
    max,
    validCount: validNumbers.length,
    missingCount
  };
}

module.exports = {
  round,
  calculateValidPercentage,
  calculateCategoricalDistribution,
  calculateNumericSummary
};
