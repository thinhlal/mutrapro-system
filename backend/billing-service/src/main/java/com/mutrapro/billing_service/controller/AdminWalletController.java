package com.mutrapro.billing_service.controller;

import com.mutrapro.billing_service.dto.response.WalletResponse;
import com.mutrapro.billing_service.dto.response.WalletTransactionResponse;
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

import java.time.LocalDateTime;

@Slf4j
@RestController
@RequestMapping("/admin/wallets")
@RequiredArgsConstructor
@Tag(name = "Admin Wallet", description = "Admin Wallet Management API")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
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
}

