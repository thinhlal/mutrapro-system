// src/services/paymentService.js
import { API_ENDPOINTS } from '../config/apiConfig';
import axiosInstance from '../utils/axiosInstance';

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
    console.log('💰 [Create Payment Order] Calling API:', API_ENDPOINTS.PAYMENT.CREATE_ORDER);
    console.log('💰 [Create Payment Order] Data:', orderData);
    const response = await axiosInstance.post(
      API_ENDPOINTS.PAYMENT.CREATE_ORDER,
      orderData
    );
    console.log('✅ [Create Payment Order] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Create Payment Order Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi tạo đơn hàng thanh toán',
      error: error.response?.statusText || 'Unknown error'
    };
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
    console.log('💰 [Get Payment Order] Calling API:', API_ENDPOINTS.PAYMENT.GET_ORDER(orderId));
    const response = await axiosInstance.get(
      API_ENDPOINTS.PAYMENT.GET_ORDER(orderId)
    );
    console.log('✅ [Get Payment Order] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Get Payment Order Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi lấy thông tin đơn hàng',
      error: error.response?.statusText || 'Unknown error'
    };
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
    console.log('💰 [Get Payment Order QR] Calling API:', API_ENDPOINTS.PAYMENT.GET_ORDER_QR(orderId));
    const response = await axiosInstance.get(
      API_ENDPOINTS.PAYMENT.GET_ORDER_QR(orderId)
    );
    console.log('✅ [Get Payment Order QR] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Get Payment Order QR Error]', error.response?.data || error.message);
    throw error.response?.data || { 
      message: error.message || 'Lỗi khi lấy QR code',
      error: error.response?.statusText || 'Unknown error'
    };
  }
};

