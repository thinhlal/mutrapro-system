// src/services/pricingService.jsx
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
    throw error.response?.data || { message: 'Lỗi khi lấy danh sách giá' };
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
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
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
    item => item.serviceType === serviceType && item.active
  );
};

/**
 * Lấy chi tiết pricing của một serviceType cụ thể
 * GET /pricing-matrix/{serviceType}
 *
 * @param {string} serviceType - Loại service: transcription, arrangement, arrangement_with_recording, recording
 * @returns {Promise} ApiResponse với pricing detail
 * Response format:
 * {
 *   status: "success",
 *   message: "Retrieved pricing successfully",
 *   data: {
 *     pricingId: string,
 *     serviceType: string,
 *     unitType: string,
 *     basePrice: number,
 *     currency: string,
 *     description: string,
 *     createdAt: string,
 *     updatedAt: string,
 *     active: boolean
 *   },
 *   statusCode: number,
 *   timestamp: string
 * }
 */
export const getPricingDetail = async serviceType => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PRICING.GET_BY_SERVICE_TYPE(serviceType)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: `Lỗi khi lấy thông tin giá của ${serviceType}`,
      }
    );
  }
};

/**
 * Tính toán giá dịch vụ
 * @param {string} serviceType - transcription | arrangement | arrangement_with_recording | recording
 * @param {number} durationMinutes - Thời lượng (phút)
 * @returns {Promise} Response data với breakdown giá
 */
export const calculatePrice = async (serviceType, durationMinutes) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PRICING.CALCULATE(serviceType, durationMinutes)
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        message: `Lỗi khi tính toán giá ${serviceType}`,
      }
    );
  }
};
