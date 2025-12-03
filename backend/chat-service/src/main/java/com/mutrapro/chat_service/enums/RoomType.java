package com.mutrapro.chat_service.enums;

public enum RoomType {
    REQUEST_CHAT,     // Chat về service request
    CONTRACT_CHAT,    // Chat về contract (có thể filter messages theo contextType: MILESTONE, REVISION_REQUEST, etc.)
    SUPPORT_CHAT,     // Chat với support team
    DIRECT_MESSAGE    // Chat 1-1 giữa 2 users
}

