// src/services/localStorageService.jsx

/**
 * Lưu trữ một giá trị vào Local Storage.
 * @param {string} key - Khóa để lưu trữ.
 * @param {any} value - Giá trị để lưu trữ (sẽ được JSON.stringify).
 */
export const setItem = (key, value) => {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Lỗi khi lưu ${key} vào localStorage`, error);
    }
  };
  
  /**
   * Lấy một giá trị từ Local Storage.
   * @param {string} key - Khóa để lấy.
   * @returns {any | undefined} - Giá trị đã được parse hoặc undefined nếu không tìm thấy.
   */
  export const getItem = (key) => {
    try {
      const serializedValue = localStorage.getItem(key);
      if (serializedValue === null) {
        return undefined;
      }
      return JSON.parse(serializedValue);
    } catch (error) {
      console.error(`Lỗi khi lấy ${key} từ localStorage`, error);
      return undefined;
    }
  };
  
  /**
   * Xóa một giá trị khỏi Local Storage.
   * @param {string} key - Khóa để xóa.
   */
  export const removeItem = (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Lỗi khi xóa ${key} khỏi localStorage`, error);
    }
  };