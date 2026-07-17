package com.taskmanager.taskmanager.controller;

import com.taskmanager.taskmanager.service.AiTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiTaskService aiTaskService;

    @PostMapping("/breakdown")
    public ResponseEntity<List<String>> breakdownTask(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String description = request.get("description");

        if (description == null || description.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<String> subtasks = aiTaskService
                .breakdownTask(description);
        return ResponseEntity.ok(subtasks);
    }
}