package com.mutrapro.billing_service.controller;

import com.mutrapro.billing_service.dto.request.PayDepositRequest;
import com.mutrapro.billing_service.dto.request.PayMilestoneRequest;
import com.mutrapro.billing_service.dto.request.PayRevisionFeeRequest;
import com.mutrapro.billing_service.dto.request.TopupWalletRequest;
import com.mutrapro.billing_service.dto.response.WalletResponse;
import com.mutrapro.billing_service.dto.response.WalletTransactionResponse;
import com.mutrapro.billing_service.enums.WalletTxType;
import com.mutrapro.billing_service.service.WalletService;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@Slf4j
@RestController
@RequestMapping("/wallets")
@RequiredArgsConstructor
@Tag(name = "Wallet", description = "Wallet Management API")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/me")
    @Operation(summary = "Lấy ví của user hiện tại (hoặc tạo mới nếu chưa có)")
    public ApiResponse<WalletResponse> getOrCreateMyWallet() {
        log.info("Getting or creating wallet for current user");
        WalletResponse wallet = walletService.getOrCreateWallet();
        return ApiResponse.<WalletResponse>builder()
                .message("Wallet retrieved successfully")
                .data(wallet)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{walletId}")
    @Operation(summary = "Lấy chi tiết ví theo ID")
    public ApiResponse<WalletResponse> getWalletById(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId) {
        log.info("Getting wallet by id: walletId={}", walletId);
        WalletResponse wallet = walletService.getWalletById(walletId);
        return ApiResponse.<WalletResponse>builder()
                .message("Wallet retrieved successfully")
                .data(wallet)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{walletId}/topup")
    @Operation(summary = "Nạp tiền vào ví")
    public ApiResponse<WalletTransactionResponse> topupWallet(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId,
            @Valid @RequestBody TopupWalletRequest request) {
        log.info("Topup wallet: walletId={}, amount={}", walletId, request.getAmount());
        WalletTransactionResponse transaction = walletService.topupWallet(walletId, request);
        return ApiResponse.<WalletTransactionResponse>builder()
                .message("Topup successful")
                .data(transaction)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{walletId}/debit/deposit")
    @Operation(summary = "Thanh toán DEPOSIT")
    public ApiResponse<WalletTransactionResponse> payDeposit(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId,
            @Valid @RequestBody PayDepositRequest request) {
        log.info("Pay deposit: walletId={}, contractId={}, amount={}", walletId, request.getContractId(), request.getAmount());
        WalletTransactionResponse transaction = walletService.payDeposit(walletId, request);
        return ApiResponse.<WalletTransactionResponse>builder()
                .message("Deposit payment successful")
                .data(transaction)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{walletId}/debit/milestone")
    @Operation(summary = "Thanh toán Milestone")
    public ApiResponse<WalletTransactionResponse> payMilestone(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId,
            @Valid @RequestBody PayMilestoneRequest request) {
        log.info("Pay milestone: walletId={}, contractId={}, milestoneId={}, amount={}", 
            walletId, request.getContractId(), request.getMilestoneId(), request.getAmount());
        WalletTransactionResponse transaction = walletService.payMilestone(walletId, request);
        return ApiResponse.<WalletTransactionResponse>builder()
                .message("Milestone payment successful")
                .data(transaction)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{walletId}/debit/revision-fee")
    @Operation(summary = "Thanh toán Revision Fee")
    public ApiResponse<WalletTransactionResponse> payRevisionFee(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId,
            @Valid @RequestBody PayRevisionFeeRequest request) {
        log.info("Pay revision fee: walletId={}, contractId={}, milestoneId={}, submissionId={}, amount={}", 
            walletId, request.getContractId(), request.getMilestoneId(), request.getSubmissionId(), request.getAmount());
        WalletTransactionResponse transaction = walletService.payRevisionFee(walletId, request);
        return ApiResponse.<WalletTransactionResponse>builder()
                .message("Revision fee payment successful")
                .data(transaction)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{walletId}/transactions")
    @Operation(summary = "Lấy danh sách giao dịch của ví")
    public ApiResponse<PageResponse<WalletTransactionResponse>> getWalletTransactions(
            @Parameter(description = "ID của ví")
            @PathVariable String walletId,
            @Parameter(description = "Loại giao dịch (topup, payment, refund, withdrawal, adjustment)")
            @RequestParam(required = false) WalletTxType txType,
            @Parameter(description = "Ngày bắt đầu (ISO format)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @Parameter(description = "Ngày kết thúc (ISO format)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @Parameter(description = "Số trang (0-based)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng items mỗi trang")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sắp xếp theo (mặc định: createdAt,desc)")
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        log.info("Getting wallet transactions: walletId={}, txType={}, fromDate={}, toDate={}, page={}, size={}", 
            walletId, txType, fromDate, toDate, page, size);
        
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equalsIgnoreCase(sortParams[1]) 
            ? Sort.Direction.DESC 
            : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));
        
        Page<WalletTransactionResponse> transactions = walletService.getWalletTransactions(
            walletId, txType, fromDate, toDate, pageable);
        
        PageResponse<WalletTransactionResponse> pageResponse = PageResponse.from(transactions);
        
        return ApiResponse.<PageResponse<WalletTransactionResponse>>builder()
                .message("Transactions retrieved successfully")
                .data(pageResponse)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/me/transactions")
    @Operation(summary = "Lấy danh sách giao dịch của ví hiện tại")
    public ApiResponse<PageResponse<WalletTransactionResponse>> getMyWalletTransactions(
            @Parameter(description = "Loại giao dịch (topup, payment, refund, withdrawal, adjustment)")
            @RequestParam(required = false) WalletTxType txType,
            @Parameter(description = "Ngày bắt đầu (ISO format)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @Parameter(description = "Ngày kết thúc (ISO format)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @Parameter(description = "Số trang (0-based)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng items mỗi trang")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sắp xếp theo (mặc định: createdAt,desc)")
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        log.info("Getting my wallet transactions: txType={}, fromDate={}, toDate={}, page={}, size={}", 
            txType, fromDate, toDate, page, size);
        
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equalsIgnoreCase(sortParams[1]) 
            ? Sort.Direction.DESC 
            : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));
        
        Page<WalletTransactionResponse> transactions = walletService.getMyWalletTransactions(
            txType, fromDate, toDate, pageable);
        
        PageResponse<WalletTransactionResponse> pageResponse = PageResponse.from(transactions);
        
        return ApiResponse.<PageResponse<WalletTransactionResponse>>builder()
                .message("Transactions retrieved successfully")
                .data(pageResponse)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }
}

