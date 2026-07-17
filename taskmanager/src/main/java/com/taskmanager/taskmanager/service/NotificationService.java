package com.taskmanager.taskmanager.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void notifyTaskUpdate(Long projectId, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/project/" + projectId,
                payload
        );
    }

    public void notifyProjectUpdate(Long projectId, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/project/" + projectId + "/general",
                payload
        );
    }

    public void notifyTaskComment(Long taskId, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/task/" + taskId + "/comments",
                payload
        );
    }
}