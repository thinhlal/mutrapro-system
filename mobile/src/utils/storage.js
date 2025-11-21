import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Save data to AsyncStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 */
export const setItem = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to AsyncStorage:`, error);
    return false;
  }
};

/**
 * Get data from AsyncStorage
 * @param {string} key - Storage key
 * @returns {any} Parsed value or null
 */
export const getItem = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error getting ${key} from AsyncStorage:`, error);
    return null;
  }
};

/**
 * Remove data from AsyncStorage
 * @param {string} key - Storage key
 */
export const removeItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from AsyncStorage:`, error);
    return false;
  }
};

/**
 * Clear all data from AsyncStorage
 */
export const clearAll = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing AsyncStorage:', error);
    return false;
  }
};

/**
 * Get multiple items from AsyncStorage
 * @param {string[]} keys - Array of storage keys
 * @returns {Object} Object with key-value pairs
 */
export const getMultiple = async (keys) => {
  try {
    const values = await AsyncStorage.multiGet(keys);
    return values.reduce((acc, [key, value]) => {
      acc[key] = value != null ? JSON.parse(value) : null;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting multiple items from AsyncStorage:', error);
    return {};
  }
};

/**
 * Set multiple items to AsyncStorage
 * @param {Array<[string, any]>} keyValuePairs - Array of [key, value] pairs
 */
export const setMultiple = async (keyValuePairs) => {
  try {
    const jsonPairs = keyValuePairs.map(([key, value]) => [
      key,
      JSON.stringify(value),
    ]);
    await AsyncStorage.multiSet(jsonPairs);
    return true;
  } catch (error) {
    console.error('Error setting multiple items to AsyncStorage:', error);
    return false;
  }
};

