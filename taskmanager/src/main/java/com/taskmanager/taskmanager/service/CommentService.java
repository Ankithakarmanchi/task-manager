package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.entity.Comment;
import com.taskmanager.taskmanager.entity.Task;
import com.taskmanager.taskmanager.entity.User;
import com.taskmanager.taskmanager.entity.Project;
import com.taskmanager.taskmanager.entity.ProjectMember;
import com.taskmanager.taskmanager.enums.Role;
import com.taskmanager.taskmanager.repository.CommentRepository;
import com.taskmanager.taskmanager.repository.TaskRepository;
import com.taskmanager.taskmanager.repository.UserRepository;
import com.taskmanager.taskmanager.repository.ProjectMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
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

    public Comment addComment(Long taskId, String content,
            String userEmail) {

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException(
                        "Task not found"));

        requireEditAccess(task.getProject(), userEmail);

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException(
                        "User not found"));

        Comment comment = new Comment();
        comment.setTask(task);
        comment.setUser(user);
        comment.setContent(content);

        Comment saved = commentRepository.save(comment);

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "COMMENT_ADDED");
        notification.put("commentId", saved.getId());
        notification.put("taskId", taskId);
        notification.put("content", saved.getContent());
        notification.put("commentedBy", user.getName());
        notificationService.notifyTaskComment(taskId, notification);

        return saved;
    }

    public List<Comment> getCommentsByTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException(
                        "Task not found"));
        return commentRepository.findByTaskOrderByCreatedAtAsc(task);
    }

    public void deleteComment(Long commentId, String requesterEmail) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException(
                        "Comment not found"));

        if (!comment.getUser().getEmail().equals(requesterEmail)) {
            throw new RuntimeException(
                    "You can only delete your own comments");
        }
        commentRepository.delete(comment);
    }
}