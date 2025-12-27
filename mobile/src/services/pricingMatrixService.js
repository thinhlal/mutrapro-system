// src/services/pricingMatrixService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Lấy danh sách pricing matrix
 * GET /pricing-matrix
 *
 * @returns {Promise} ApiResponse với danh sách pricing
 * Response format:
 * {
 *   status: "success",
 *   message: "Retrieved pricing matrix successfully",
 *   data: [
 *     {
 *       pricingId: string,
 *       serviceType: string,
 *       unitType: string,
 *       basePrice: number,
 *       currency: string,
 *       description: string,
 *       createdAt: string,
 *       updatedAt: string,
 *       active: boolean
 *     }
 *   ],
 *   statusCode: number,
 *   timestamp: string
 * }
 */
export const getPricingMatrix = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.PRICING.GET_ALL);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error getting pricing list' };
  }
};

/**
 * Format price theo định dạng VND
 * @param {number} price - Giá cần format
 * @param {string} currency - Đơn vị tiền tệ (VND, USD, etc.)
 * @returns {string} Giá đã được format
 */
export const formatPrice = (price, currency = 'VND') => {
  if (!price) return '';

  if (currency === 'VND') {
    // Format VND without decimals
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
};

/**
 * Lấy pricing theo serviceType từ một list
 * @param {Array} pricingData - Danh sách pricing từ API
 * @param {string} serviceType - Loại service cần lấy
 * @returns {Object|null} Pricing object hoặc null nếu không tìm thấy
 */
export const getPricingByServiceType = (pricingData, serviceType) => {
  if (!pricingData || !Array.isArray(pricingData)) return null;
  return pricingData.find(
    (item) => item.serviceType === serviceType && item.active
  );
};

/**
 * Lấy chi tiết pricing của một serviceType cụ thể
 * GET /pricing-matrix/{serviceType}
 *
 * @param {string} serviceType - Loại service: transcription, arrangement, arrangement_with_recording
 * @returns {Promise} ApiResponse với pricing detail
 */
export const getPricingDetail = async (serviceType) => {
  try {
    // Backend enum uses underscore format: arrangement_with_recording
    // Keep the original format for path variable
    let urlServiceType = serviceType;
    if (serviceType === 'arrangement-with-recording') {
      urlServiceType = 'arrangement_with_recording';
    }
    
    const response = await axiosInstance.get(
      API_ENDPOINTS.PRICING.GET_BY_SERVICE_TYPE(urlServiceType)
    );
    return response.data;
  } catch (error) {
    console.error('Error getting pricing detail:', error);
    throw error.response?.data || {
      message: `Error getting pricing information for ${serviceType}`,
    };
  }
};

/**
 * Tính toán giá dịch vụ
 * @param {string} serviceType - transcription | arrangement | arrangement_with_recording
 * @param {number} durationMinutes - Thời lượng (phút)
 * @returns {Promise} Response data với breakdown giá
 */
export const calculatePrice = async (serviceType, durationMinutes) => {
  try {
    // Convert serviceType to URL format (arrangement_with_recording -> arrangement-with-recording)
    let urlServiceType = serviceType;
    if (serviceType === 'arrangement_with_recording' || serviceType === 'arrangement-with-recording') {
      urlServiceType = 'arrangement-with-recording';
    }
    
    // Build URL - only add durationMinutes for transcription
    // Extract base path from API_ENDPOINTS
    const basePath = API_ENDPOINTS.PRICING.GET_ALL.replace('/pricing-matrix', '');
    let url = `${basePath}/pricing-matrix/calculate/${urlServiceType}`;
    
    if (serviceType === 'transcription' && durationMinutes !== undefined && durationMinutes !== null) {
      url += `?durationMinutes=${durationMinutes}`;
    }
    
    console.log('💰 [Calculate Price] Calling API:', url);
    const response = await axiosInstance.get(url);
    console.log('✅ [Calculate Price] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error calculating price:', error);
    throw error.response?.data || {
      message: `Error calculating price for ${serviceType}`,
    };
  }
};

