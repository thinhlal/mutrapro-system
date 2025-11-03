package com.mutrapro.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@ConfigurationProperties(prefix = "app.event-topics")
public class OutboxTopicProperties {

	private Map<String, String> mappings = new HashMap<>();

	public Map<String, String> getMappings() {
		return mappings;
	}

	public void setMappings(Map<String, String> mappings) {
		this.mappings = mappings;
	}
}


