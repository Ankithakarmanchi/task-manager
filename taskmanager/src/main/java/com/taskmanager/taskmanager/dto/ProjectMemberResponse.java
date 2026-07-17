package com.taskmanager.taskmanager.dto;

import java.time.LocalDateTime;

public class ProjectMemberResponse {

    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String role;
    private LocalDateTime joinedAt;

    public ProjectMemberResponse(Long id, Long userId, String name, String email, String role, LocalDateTime joinedAt) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }
}