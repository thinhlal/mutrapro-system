import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

/**
 * Service cho SePay Payment API
 */

/**
 * Tạo payment order để nạp tiền vào ví
 * POST /api/v1/billing/payments/orders
 *
 * @param {Object} orderData - Thông tin đơn hàng
 * @param {number} orderData.amount - Số tiền nạp (tối thiểu 1000 VND)
 * @param {string} orderData.currency - Loại tiền tệ (VND, USD, EUR) - optional, default VND
 * @param {string} orderData.description - Mô tả đơn hàng - optional
 * @returns {Promise} ApiResponse với thông tin payment order
 */
export const createPaymentOrder = async (orderData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.PAYMENT.CREATE_ORDER,
      orderData
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi tạo đơn hàng thanh toán' };
  }
};

/**
 * Lấy thông tin payment order
 * GET /api/v1/billing/payments/orders/{orderId}
 *
 * @param {string} orderId - ID của payment order
 * @returns {Promise} ApiResponse với thông tin payment order
 */
export const getPaymentOrder = async (orderId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PAYMENT.GET_ORDER(orderId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy thông tin đơn hàng' };
  }
};

/**
 * Lấy QR code URL cho payment order
 * GET /api/v1/billing/payments/orders/{orderId}/qr
 *
 * @param {string} orderId - ID của payment order
 * @returns {Promise} ApiResponse với QR code URL
 */
export const getPaymentOrderQR = async (orderId) => {
  try {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PAYMENT.GET_ORDER_QR(orderId)
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Lỗi khi lấy QR code' };
  }
};

