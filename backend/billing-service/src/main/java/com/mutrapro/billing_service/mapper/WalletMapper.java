package com.mutrapro.billing_service.mapper;

import com.mutrapro.billing_service.dto.response.WalletResponse;
import com.mutrapro.billing_service.dto.response.WalletTransactionResponse;
import com.mutrapro.billing_service.entity.Wallet;
import com.mutrapro.billing_service.entity.WalletTransaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface WalletMapper {
    
    WalletResponse toResponse(Wallet wallet);
    
    @Mapping(target = "walletId", source = "wallet.walletId")
    @Mapping(target = "refundOfWalletTxId", source = "refundOfWalletTx.walletTxId")
    WalletTransactionResponse toResponse(WalletTransaction transaction);
}

