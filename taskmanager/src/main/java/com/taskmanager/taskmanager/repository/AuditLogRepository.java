package com.taskmanager.taskmanager.repository;

import com.taskmanager.taskmanager.entity.AuditLog;
import com.taskmanager.taskmanager.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByTaskOrderByChangedAtAsc(Task task);
}