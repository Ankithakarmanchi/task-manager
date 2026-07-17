package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.entity.*;
import com.taskmanager.taskmanager.enums.TaskStatus;
import com.taskmanager.taskmanager.enums.Role;
import com.taskmanager.taskmanager.repository.*;
import com.taskmanager.taskmanager.dto.AuditLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final ProjectMemberRepository projectMemberRepository;

    private void requireEditAccess(Project project, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ProjectMember membership = projectMemberRepository
                .findByProjectAndUser(project, user)
                .orElseThrow(() -> new RuntimeException(
                        "You are not a member of this project"));
        if (membership.getRole() == Role.VIEWER) {
            throw new RuntimeException(
                    "Viewers do not have permission to make changes");
        }
    }

    private void requireAdminAccess(Project project, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        ProjectMember membership = projectMemberRepository
                .findByProjectAndUser(project, user)
                .orElseThrow(() -> new RuntimeException(
                        "You are not a member of this project"));
        if (membership.getRole() != Role.ADMIN) {
            throw new RuntimeException(
                    "Only ADMIN members can perform this action");
        }
    }

    // NEW: auto-add an assignee as a project MEMBER if they aren't one yet
    private void ensureProjectMembership(Project project, User assignee) {
        boolean alreadyMember = projectMemberRepository
                .existsByProjectAndUser(project, assignee);
        if (!alreadyMember) {
            ProjectMember member = new ProjectMember();
            member.setProject(project);
            member.setUser(assignee);
            member.setRole(Role.MEMBER);
            projectMemberRepository.save(member);
        }
    }

    public Task createTask(Long projectId, String title,
            String description, String assigneeEmail,
            String creatorEmail) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException(
                        "Project not found"));

        requireAdminAccess(project, creatorEmail);

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException(
                        "User not found"));

        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setProject(project);
        task.setCreatedBy(creator);
        task.setStatus(TaskStatus.TODO);

        if (assigneeEmail != null && !assigneeEmail.isEmpty()) {
            User assignee = userRepository.findByEmail(assigneeEmail)
                    .orElseThrow(() -> new RuntimeException(
                            "Assignee not found"));
            task.setAssignedTo(assignee);
            ensureProjectMembership(project, assignee);
        }

        Task saved = taskRepository.save(task);

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "TASK_CREATED");
        notification.put("taskId", saved.getId());
        notification.put("title", saved.getTitle());
        notification.put("status", saved.getStatus());
        notification.put("createdBy", creator.getName());
        notificationService.notifyTaskUpdate(projectId, notification);

        return saved;
    }

    public List<Task> getTasksByProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException(
                        "Project not found"));
        return taskRepository.findByProject(project);
    }

    public Task updateTaskStatus(Long taskId,
            TaskStatus newStatus, String updaterEmail) {

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException(
                        "Task not found"));

        requireEditAccess(task.getProject(), updaterEmail);

        User updater = userRepository.findByEmail(updaterEmail)
                .orElseThrow(() -> new RuntimeException(
                        "User not found"));

        TaskStatus oldStatus = task.getStatus();
        task.setStatus(newStatus);
        Task updated = taskRepository.save(task);

        AuditLog log = new AuditLog();
        log.setTask(updated);
        log.setChangedBy(updater);
        log.setOldStatus(oldStatus);
        log.setNewStatus(newStatus);
        auditLogRepository.save(log);

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "TASK_STATUS_UPDATED");
        notification.put("taskId", taskId);
        notification.put("oldStatus", oldStatus);
        notification.put("newStatus", newStatus);
        notification.put("updatedBy", updater.getName());
        notificationService.notifyTaskUpdate(
                updated.getProject().getId(), notification);

        return updated;
    }

    public List<AuditLogResponse> getAuditLogsForTask(Long taskId) {
        Task task = getTaskById(taskId);
        List<AuditLog> logs = auditLogRepository.findByTaskOrderByChangedAtAsc(task);

        return logs.stream()
                .map(log -> new AuditLogResponse(
                        log.getId(),
                        log.getChangedBy().getName(),
                        log.getChangedBy().getEmail(),
                        log.getOldStatus(),
                        log.getNewStatus(),
                        log.getChangedAt()
                ))
                .collect(Collectors.toList());
    }

    public Task getTaskById(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException(
                        "Task not found with id: " + taskId));
    }

    public void deleteTask(Long taskId, String requesterEmail) {
        Task task = getTaskById(taskId);
        requireAdminAccess(task.getProject(), requesterEmail);
        taskRepository.delete(task);
    }

    public List<Task> getTasksByAssignee(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException(
                        "User not found"));
        return taskRepository.findByAssignedTo(user);
    }
}