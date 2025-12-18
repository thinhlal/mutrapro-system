package com.mutrapro.billing_service.controller;

import com.mutrapro.billing_service.dto.response.WalletResponse;
import com.mutrapro.billing_service.dto.response.WalletStatisticsResponse;
import com.mutrapro.billing_service.dto.response.WalletTransactionResponse;
import com.mutrapro.billing_service.dto.response.WithdrawalRequestResponse;
import com.mutrapro.billing_service.entity.WithdrawalRequest;
import com.mutrapro.billing_service.enums.WithdrawalStatus;
import com.mutrapro.billing_service.enums.WalletTxType;
import com.mutrapro.billing_service.service.WalletService;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Slf4j
@RestController
@RequestMapping("/admin/wallets")
@RequiredArgsConstructor
@Tag(name = "Admin Wallet", description = "Admin Wallet Management API")
@PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'MANAGER')")
public class AdminWalletController {

    private final WalletService walletService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả wallets (Admin only)")
    public ApiResponse<PageResponse<WalletResponse>> getAllWallets(
            @Parameter(description = "Filter theo userId")
            @RequestParam(required = false) String userId,
            @Parameter(description = "Số trang (0-based)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng items mỗi trang")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sắp xếp theo (mặc định: createdAt,desc)")
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        log.info("Admin getting all wallets: userId={}, page={}, size={}", userId, page, size);
        
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equalsIgnoreCase(sortParams[1]) 
            ? Sort.Direction.DESC 
            : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));
        
        Page<WalletResponse> wallets = walletService.getAllWallets(userId, pageable);
        PageResponse<WalletResponse> pageResponse = PageResponse.from(wallets);
        
        return ApiResponse.<PageResponse<WalletResponse>>builder()
                .message("Wallets retrieved successfully")
                .data(pageResponse)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{walletId}")
    @Operation(summary = "Lấy chi tiết wallet theo ID (Admin only)")
    public ApiResponse<WalletResponse> getWalletById(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId) {
        log.info("Admin getting wallet by id: walletId={}", walletId);
        WalletResponse wallet = walletService.getWalletByIdForAdmin(walletId);
        return ApiResponse.<WalletResponse>builder()
                .message("Wallet retrieved successfully")
                .data(wallet)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{walletId}/transactions")
    @Operation(summary = "Lấy danh sách giao dịch của wallet (Admin only)")
    public ApiResponse<PageResponse<WalletTransactionResponse>> getWalletTransactions(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId,
            @Parameter(description = "Loại giao dịch (topup, payment, refund, withdrawal, adjustment)")
            @RequestParam(required = false) WalletTxType txType,
            @Parameter(description = "Tìm kiếm theo Transaction ID, Contract ID, Milestone ID, Booking ID")
            @RequestParam(required = false) String search,
            @Parameter(description = "Ngày bắt đầu (ISO format)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @Parameter(description = "Ngày kết thúc (ISO format)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @Parameter(description = "Số trang (0-based)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng items mỗi trang")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sắp xếp theo (mặc định: createdAt,desc)")
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        log.info("Admin getting wallet transactions: walletId={}, txType={}, search={}, fromDate={}, toDate={}, page={}, size={}", 
            walletId, txType, search, fromDate, toDate, page, size);
        
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equalsIgnoreCase(sortParams[1]) 
            ? Sort.Direction.DESC 
            : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));
        
        Page<WalletTransactionResponse> transactions = walletService.getWalletTransactionsForAdmin(
            walletId, txType, fromDate, toDate, search, pageable);
        
        PageResponse<WalletTransactionResponse> pageResponse = PageResponse.from(transactions);
        
        return ApiResponse.<PageResponse<WalletTransactionResponse>>builder()
                .message("Transactions retrieved successfully")
                .data(pageResponse)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/statistics")
    @Operation(summary = "Lấy thống kê tổng quan về wallets và transactions (Admin only)")
    public ApiResponse<WalletStatisticsResponse> getWalletStatistics() {
        log.info("Admin getting wallet statistics");
        WalletStatisticsResponse stats = walletService.getWalletStatisticsForAdmin();
        return ApiResponse.<WalletStatisticsResponse>builder()
                .message("Wallet statistics retrieved successfully")
                .data(stats)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/withdrawal-requests")
    @Operation(summary = "Lấy danh sách withdrawal requests (Admin only)")
    public ApiResponse<PageResponse<WithdrawalRequestResponse>> getWithdrawalRequests(
            @Parameter(description = "Filter theo status (PENDING, APPROVED, REJECTED)")
            @RequestParam(required = false) WithdrawalStatus status,
            @Parameter(description = "Số trang (0-based)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng items mỗi trang")
            @RequestParam(defaultValue = "20") int size) {
        log.info("Admin getting withdrawal requests: status={}, page={}, size={}", status, page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<WithdrawalRequestResponse> requests = walletService.getWithdrawalRequests(status, pageable);
        PageResponse<WithdrawalRequestResponse> pageResponse = PageResponse.from(requests);
        return ApiResponse.<PageResponse<WithdrawalRequestResponse>>builder()
                .message("Withdrawal requests retrieved successfully")
                .data(pageResponse)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/withdrawal-requests/{withdrawalRequestId}/approve")
    @Operation(summary = "Duyệt yêu cầu rút tiền (Admin/Manager only) - Tiền vẫn hold, chờ admin/manager chuyển tiền")
    public ApiResponse<WithdrawalRequestResponse> approveWithdrawal(
            @Parameter(description = "ID của withdrawal request")
            @PathVariable String withdrawalRequestId,
            @Parameter(description = "Ghi chú của admin (optional)")
            @RequestParam(required = false) String adminNote) {
        log.info("Admin approving withdrawal request: requestId={}, adminNote={}", withdrawalRequestId, adminNote);
        WithdrawalRequestResponse request = walletService.approveWithdrawal(withdrawalRequestId, adminNote);
        return ApiResponse.<WithdrawalRequestResponse>builder()
                .message("Withdrawal request approved successfully. Waiting for admin/manager to transfer money.")
                .data(request)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/withdrawal-requests/{withdrawalRequestId}/reject")
    @Operation(summary = "Từ chối yêu cầu rút tiền (Admin/Manager only) - Release hold về available")
    public ApiResponse<WithdrawalRequestResponse> rejectWithdrawal(
            @Parameter(description = "ID của withdrawal request")
            @PathVariable String withdrawalRequestId,
            @Parameter(description = "Lý do từ chối (required)")
            @RequestParam(required = true) String rejectionReason,
            @Parameter(description = "Ghi chú của admin (optional)")
            @RequestParam(required = false) String adminNote) {
        log.info("Admin rejecting withdrawal request: requestId={}, reason={}, adminNote={}", 
            withdrawalRequestId, rejectionReason, adminNote);
        WithdrawalRequestResponse request = walletService.rejectWithdrawal(withdrawalRequestId, rejectionReason, adminNote);
        return ApiResponse.<WithdrawalRequestResponse>builder()
                .message("Withdrawal request rejected successfully. Hold balance has been released.")
                .data(request)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping(value = "/withdrawal-requests/{withdrawalRequestId}/complete", consumes = {"multipart/form-data"})
    @Operation(summary = "Hoàn thành chuyển tiền (Admin/Manager only) - Trừ tiền từ hold, tạo transaction")
    public ApiResponse<WalletTransactionResponse> completeWithdrawal(
            @Parameter(description = "ID của withdrawal request")
            @PathVariable String withdrawalRequestId,
            @Parameter(description = "Số tiền thực tế đã chuyển (optional, default = amount)")
            @RequestParam(required = false) BigDecimal paidAmount,
            @Parameter(description = "Nhà cung cấp dịch vụ chuyển tiền (optional)")
            @RequestParam(required = false) String provider,
            @Parameter(description = "Mã tham chiếu từ ngân hàng (optional)")
            @RequestParam(required = false) String bankRef,
            @Parameter(description = "Mã giao dịch từ provider (optional)")
            @RequestParam(required = false) String txnCode,
            @Parameter(description = "File ảnh/biên lai chuyển tiền (JPEG, PNG, max 10MB, optional)")
            @RequestParam(required = false) MultipartFile proofFile) {
        log.info("Admin/Manager completing withdrawal: requestId={}, paidAmount={}, provider={}, bankRef={}, txnCode={}, hasProofFile={}", 
            withdrawalRequestId, paidAmount, provider, bankRef, txnCode, proofFile != null && !proofFile.isEmpty());
        WalletTransactionResponse transaction = walletService.completeWithdrawal(
                withdrawalRequestId, paidAmount, provider, bankRef, txnCode, proofFile);
        return ApiResponse.<WalletTransactionResponse>builder()
                .message("Withdrawal completed successfully. Money has been deducted from wallet.")
                .data(transaction)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/withdrawal-requests/{withdrawalRequestId}/fail")
    @Operation(summary = "Đánh dấu chuyển tiền thất bại/nhầm (Admin/Manager only) - Release hold về available")
    public ApiResponse<WithdrawalRequestResponse> failWithdrawal(
            @Parameter(description = "ID của withdrawal request")
            @PathVariable String withdrawalRequestId,
            @Parameter(description = "Lý do thất bại (required)")
            @RequestParam(required = true) String failureReason) {
        log.info("Admin/Manager marking withdrawal as failed: requestId={}, reason={}", withdrawalRequestId, failureReason);
        WithdrawalRequestResponse request = walletService.failWithdrawal(withdrawalRequestId, failureReason);
        return ApiResponse.<WithdrawalRequestResponse>builder()
                .message("Withdrawal marked as failed. Hold balance has been released.")
                .data(request)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/withdrawal-requests/{withdrawalRequestId}/proof")
    @Operation(summary = "Download proof file của withdrawal request (Admin/Manager only)")
    public ResponseEntity<ByteArrayResource> downloadProofFile(
            @Parameter(description = "ID của withdrawal request")
            @PathVariable String withdrawalRequestId) {
        log.info("Admin/Manager downloading proof file: requestId={}", withdrawalRequestId);
        
        // Get withdrawal request
        WithdrawalRequest request = 
                walletService.getWithdrawalRequestById(withdrawalRequestId);
        
        if (request.getProofUrl() == null || request.getProofUrl().isBlank()) {
            throw new RuntimeException("Proof file not found for withdrawal request: " + withdrawalRequestId);
        }
        
        // Download file from S3
        byte[] fileContent = walletService.downloadProofFile(request.getProofUrl());
        
        // Create Resource
        ByteArrayResource resource = new ByteArrayResource(fileContent);
        
        // Set headers
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, 
                "inline; filename=\"proof-" + withdrawalRequestId + ".jpg\"");
        headers.add(HttpHeaders.CONTENT_TYPE, "image/jpeg");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
    }
}

