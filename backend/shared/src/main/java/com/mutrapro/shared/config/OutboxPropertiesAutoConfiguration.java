package com.mutrapro.shared.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@AutoConfiguration
@EnableConfigurationProperties(OutboxTopicProperties.class)
public class OutboxPropertiesAutoConfiguration {
}


