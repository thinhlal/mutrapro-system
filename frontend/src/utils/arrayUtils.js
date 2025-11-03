// src/utils/arrayUtils.js
// Utility functions cho array operations

/**
 * Tạo array lặp lại để tạo hiệu ứng marquee vô hạn
 * @param {Array} array - Array gốc
 * @param {number} times - Số lần lặp (mặc định 2)
 * @returns {Array} - Array đã được lặp
 */
export const createLoopedArray = (array, times = 2) => {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  const result = [];
  for (let i = 0; i < times; i++) {
    result.push(...array);
  }
  return result;
};

/**
 * Tạo unique key cho React elements
 * @param {string} baseKey - Key gốc
 * @param {number} index - Index
 * @returns {string} - Unique key
 */
export const createUniqueKey = (baseKey, index) => {
  return `${baseKey}-${index}`;
};
