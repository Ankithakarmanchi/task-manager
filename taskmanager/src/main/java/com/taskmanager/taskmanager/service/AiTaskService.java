package com.taskmanager.taskmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AiTaskService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public List<String> breakdownTask(String taskDescription) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            String prompt = """
                    You are a project management assistant.
                    Break down the following task into 3-5 specific,
                    actionable subtasks.
                    Return ONLY a JSON array of strings.
                    No explanation, no markdown, just the JSON array.
                    Example: ["Subtask 1", "Subtask 2", "Subtask 3"]
                    
                    Task: %s
                    """.formatted(taskDescription);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "llama-3.1-8b-instant");
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 500);

            Map<String, String> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);
            requestBody.put("messages", List.of(message));

            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    groqApiUrl,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("choices")
                    .get(0)
                    .path("message")
                    .path("content")
                    .asText();

            content = content.trim();
            if (content.startsWith("```")) {
                content = content.replaceAll("```json", "")
                        .replaceAll("```", "").trim();
            }

            JsonNode subtasksNode = objectMapper.readTree(content);
            List<String> subtasks = new ArrayList<>();
            subtasksNode.forEach(node -> subtasks.add(node.asText()));
            return subtasks;

        } catch (Exception e) {
            System.err.println("AI Service Error: " + e.getMessage());
            e.printStackTrace();
            return List.of(
                    "Define requirements for: " + taskDescription,
                    "Implement: " + taskDescription,
                    "Test: " + taskDescription,
                    "Review and deploy: " + taskDescription
            );
        }
    }
}