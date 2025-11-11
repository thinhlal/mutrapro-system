package com.mutrapro.chat_service.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for real-time chat
 * Sử dụng WebSocketAuthInterceptor từ shared module
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ChannelInterceptor webSocketAuthInterceptor;

    public WebSocketConfig(@Qualifier("webSocketAuthInterceptor") ChannelInterceptor webSocketAuthInterceptor) {
        this.webSocketAuthInterceptor = webSocketAuthInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker to send messages to clients
        // Prefix for messages FROM server TO client
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix for messages FROM client TO server
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix for user-specific messages
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint that clients will connect to
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // Configure properly for production
                .withSockJS();  // Enable SockJS fallback options
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Register authentication interceptor (tự động được inject từ shared module)
        registration.interceptors(webSocketAuthInterceptor);
    }
}

