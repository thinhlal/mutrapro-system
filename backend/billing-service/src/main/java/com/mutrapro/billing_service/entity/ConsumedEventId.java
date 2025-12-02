package com.mutrapro.billing_service.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite Primary Key cho ConsumedEvent
 */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ConsumedEventId implements Serializable {
    
    private UUID eventId;
    private String consumerName;
}

