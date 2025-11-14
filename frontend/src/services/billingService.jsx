import axiosInstance from '../utils/axiosInstance';
import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Billing Service - REST API for Billing Service (Installments)
 */

// ==================== Contract Installments ====================

/**
 * Get all installments for a contract
 * GET /contract-installments/contract/{contractId}
 */
export const getInstallmentsByContractId = async contractId => {
  const response = await axiosInstance.get(
    API_ENDPOINTS.INSTALLMENTS.GET_BY_CONTRACT_ID(contractId)
  );
  return response.data;
};

/**
 * Get pending deposit installment for a contract
 * GET /contract-installments/contract/{contractId}/pending-deposit
 */
export const getPendingDepositInstallment = async contractId => {
  const response = await axiosInstance.get(
    API_ENDPOINTS.INSTALLMENTS.GET_PENDING_DEPOSIT(contractId)
  );
  return response.data;
};

export default {
  getInstallmentsByContractId,
  getPendingDepositInstallment,
};

