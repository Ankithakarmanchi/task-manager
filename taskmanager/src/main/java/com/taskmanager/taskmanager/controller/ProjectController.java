package com.taskmanager.taskmanager.controller;

import com.taskmanager.taskmanager.dto.ProjectMemberResponse;
import com.taskmanager.taskmanager.entity.Project;
import com.taskmanager.taskmanager.enums.Role;
import com.taskmanager.taskmanager.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<Project> createProject(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Project project = projectService.createProject(
                request.get("name"),
                request.get("description"),
                userDetails.getUsername()
        );
        return ResponseEntity.ok(project);
    }

    @GetMapping
    public ResponseEntity<List<Project>> getUserProjects(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                projectService.getUserProjects(
                        userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<String> addMember(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.addMember(
                id,
                request.get("email"),
                Role.valueOf(request.get("role")),
                userDetails.getUsername()
        );
        return ResponseEntity.ok("Member added successfully");
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<ProjectMemberResponse>> getMembers(
            @PathVariable Long id) {
        return ResponseEntity.ok(projectService.getMembers(id));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<String> removeMember(
            @PathVariable Long id,
            @PathVariable Long memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.removeMember(id, memberId, userDetails.getUsername());
        return ResponseEntity.ok("Member removed successfully");
    }

    @PatchMapping("/{id}/members/{memberId}/role")
    public ResponseEntity<String> updateMemberRole(
            @PathVariable Long id,
            @PathVariable Long memberId,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.updateMemberRole(
                id,
                memberId,
                Role.valueOf(request.get("role")),
                userDetails.getUsername()
        );
        return ResponseEntity.ok("Member role updated successfully");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteProject(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        projectService.deleteProject(id, userDetails.getUsername());
        return ResponseEntity.ok("Project deleted successfully");
    }
}