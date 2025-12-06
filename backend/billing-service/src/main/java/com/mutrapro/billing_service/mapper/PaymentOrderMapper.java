package com.mutrapro.billing_service.mapper;

import com.mutrapro.billing_service.dto.response.PaymentOrderResponse;
import com.mutrapro.billing_service.entity.PaymentOrder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface PaymentOrderMapper {

    PaymentOrderMapper INSTANCE = Mappers.getMapper(PaymentOrderMapper.class);

    @Mapping(source = "wallet.walletId", target = "walletId")
    PaymentOrderResponse toResponse(PaymentOrder paymentOrder);
}

