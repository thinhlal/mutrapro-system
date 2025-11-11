package com.mutrapro.shared.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import java.util.List;

/**
 * WebSocket Authentication Interceptor Auto-Configuration
 * Tự động tạo WebSocketAuthInterceptor bean khi có WebSocket và JWT dependencies
 */
@Slf4j
@AutoConfiguration
@ConditionalOnClass({ChannelInterceptor.class, JwtDecoder.class})
public class WebSocketAuthInterceptorAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(name = "webSocketAuthInterceptor")
    public ChannelInterceptor webSocketAuthInterceptor(
            JwtDecoder jwtDecoder,
            JwtAuthenticationConverter jwtAuthenticationConverter) {
        return new WebSocketAuthInterceptor(jwtDecoder, jwtAuthenticationConverter);
    }

    /**
     * Internal implementation of WebSocket Authentication Interceptor
     */
    @Slf4j
    @RequiredArgsConstructor
    static class WebSocketAuthInterceptor implements ChannelInterceptor {

        private final JwtDecoder jwtDecoder;
        private final JwtAuthenticationConverter jwtAuthenticationConverter;

        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
            
            if (accessor == null) {
                return message;
            }

            StompCommand command = accessor.getCommand();
            
            // Xử lý CONNECT command - extract JWT từ header
            if (StompCommand.CONNECT.equals(command)) {
                log.info("🔐 WebSocket CONNECT received: sessionId={}", accessor.getSessionId());
                
                List<String> authorization = accessor.getNativeHeader("Authorization");
                String token = null;
                
                if (authorization != null && !authorization.isEmpty()) {
                    String authHeader = authorization.get(0);
                    log.debug("Authorization header found: {}", authHeader != null && authHeader.length() > 20 
                        ? authHeader.substring(0, 20) + "..." : "null");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        token = authHeader.substring(7);
                    }
                } else {
                    log.warn("⚠️ No Authorization header in CONNECT message");
                }
                
                if (token != null && !token.isEmpty()) {
                    try {
                        // Decode và validate JWT
                        Jwt jwt = jwtDecoder.decode(token);
                        Authentication authentication = jwtAuthenticationConverter.convert(jwt);
                        
                        // Set authentication vào header accessor
                        accessor.setUser(authentication);
                        
                        // Lưu authentication vào session attributes để dùng cho các message sau
                        if (accessor.getSessionAttributes() != null) {
                            accessor.getSessionAttributes().put("AUTHENTICATION", authentication);
                            log.info("✅ WebSocket authenticated user: {}, sessionId={}", 
                                authentication.getName(), accessor.getSessionId());
                        } else {
                            log.error("❌ Session attributes is null, cannot store authentication");
                        }
                    } catch (Exception e) {
                        log.error("❌ WebSocket authentication failed: {}", e.getMessage(), e);
                        // Không throw exception - để connection tiếp tục nhưng không có auth
                        // Controller sẽ xử lý và reject message
                    }
                } else {
                    log.warn("⚠️ WebSocket CONNECT without valid Authorization token");
                }
            } 
            // Cho các message khác (SEND, SUBSCRIBE, etc.) - retrieve authentication từ session
            else if (!StompCommand.DISCONNECT.equals(command)) {
                log.debug("📨 WebSocket message: command={}, sessionId={}", command, accessor.getSessionId());
                
                if (accessor.getSessionAttributes() != null) {
                    Authentication authentication = (Authentication) accessor.getSessionAttributes().get("AUTHENTICATION");
                    if (authentication != null && authentication.isAuthenticated()) {
                        accessor.setUser(authentication);
                        log.debug("✅ Authentication retrieved from session: user={}", authentication.getName());
                    } else {
                        log.warn("⚠️ WebSocket message from unauthenticated session: command={}, sessionId={}", 
                            command, accessor.getSessionId());
                    }
                } else {
                    log.warn("⚠️ Session attributes is null for command: {}", command);
                }
            }
            
            return message;
        }
    }
}
