package com.taskmanager.taskmanager.dto;

import com.taskmanager.taskmanager.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private String changedByName;
    private String changedByEmail;
    private TaskStatus oldStatus;
    private TaskStatus newStatus;
    private LocalDateTime changedAt;
}