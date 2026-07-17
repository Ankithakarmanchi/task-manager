package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.dto.ProjectMemberResponse;
import com.taskmanager.taskmanager.entity.Project;
import com.taskmanager.taskmanager.entity.ProjectMember;
import com.taskmanager.taskmanager.entity.User;
import com.taskmanager.taskmanager.enums.Role;
import com.taskmanager.taskmanager.repository.ProjectMemberRepository;
import com.taskmanager.taskmanager.repository.ProjectRepository;
import com.taskmanager.taskmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public Project createProject(String name, String description,
            String creatorEmail) {

        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        project.setCreatedBy(creator);

        Project saved = projectRepository.save(project);

        ProjectMember member = new ProjectMember();
        member.setProject(saved);
        member.setUser(creator);
        member.setRole(Role.ADMIN);
        projectMemberRepository.save(member);

        return saved;
    }

    
    public Project getProjectById(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Project not found with id: " + id));
    }

   public List<Project> getUserProjects(String email) {
    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    return projectMemberRepository.findProjectsByUser(user);
}

    public void addMember(Long projectId, String memberEmail,
            Role role, String requesterEmail) {

        Project project = getProjectById(projectId);

        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectMember requesterMember = projectMemberRepository
                .findByProjectAndUser(project, requester)
                .orElseThrow(() -> new RuntimeException(
                        "You are not a member of this project"));

        if (requesterMember.getRole() != Role.ADMIN) {
            throw new RuntimeException("Only ADMIN can add members");
        }

        User newMember = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new RuntimeException(
                        "User not found with email: " + memberEmail));

        if (projectMemberRepository.existsByProjectAndUser(
                project, newMember)) {
            throw new RuntimeException("User is already a member");
        }

        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(newMember);
        member.setRole(role);
        projectMemberRepository.save(member);
    }

    public List<ProjectMemberResponse> getMembers(Long projectId) {
        Project project = getProjectById(projectId);

        List<ProjectMember> members = projectMemberRepository.findByProject(project);

        return members.stream()
                .map(m -> new ProjectMemberResponse(
                        m.getId(),
                        m.getUser().getId(),
                        m.getUser().getName(),
                        m.getUser().getEmail(),
                        m.getRole().toString(),
                        m.getJoinedAt()
                ))
                .collect(Collectors.toList());
    }

    // --- NEW: shared authorization check for remove / role-change ---
    private void checkCanManageMember(Project project, ProjectMember requesterMember,
            ProjectMember targetMember, String requesterEmail) {

        if (requesterMember.getRole() != Role.ADMIN) {
            throw new RuntimeException("Only ADMIN can manage members");
        }

        boolean requesterIsOwner = project.getCreatedBy().getEmail().equals(requesterEmail);
        boolean targetIsOwner = targetMember.getUser().getEmail()
                .equals(project.getCreatedBy().getEmail());

        if (targetIsOwner) {
            throw new RuntimeException("The project owner cannot be removed or changed");
        }

        if (targetMember.getUser().getEmail().equals(requesterEmail)) {
            throw new RuntimeException("You cannot remove or change your own membership here");
        }

        if (targetMember.getRole() == Role.ADMIN && !requesterIsOwner) {
            throw new RuntimeException("Only the project owner can remove or change another ADMIN");
        }
    }

    public void removeMember(Long projectId, Long memberId, String requesterEmail) {
        Project project = getProjectById(projectId);

        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectMember requesterMember = projectMemberRepository
                .findByProjectAndUser(project, requester)
                .orElseThrow(() -> new RuntimeException(
                        "You are not a member of this project"));

        ProjectMember targetMember = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!targetMember.getProject().getId().equals(projectId)) {
            throw new RuntimeException("Member does not belong to this project");
        }

        checkCanManageMember(project, requesterMember, targetMember, requesterEmail);

        projectMemberRepository.delete(targetMember);
    }

    public void updateMemberRole(Long projectId, Long memberId, Role newRole,
            String requesterEmail) {

        Project project = getProjectById(projectId);

        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectMember requesterMember = projectMemberRepository
                .findByProjectAndUser(project, requester)
                .orElseThrow(() -> new RuntimeException(
                        "You are not a member of this project"));

        ProjectMember targetMember = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        if (!targetMember.getProject().getId().equals(projectId)) {
            throw new RuntimeException("Member does not belong to this project");
        }

        checkCanManageMember(project, requesterMember, targetMember, requesterEmail);

        targetMember.setRole(newRole);
        projectMemberRepository.save(targetMember);
    }

    @CacheEvict(value = "projects", key = "#id")
    public void deleteProject(Long id, String requesterEmail) {
        Project project = getProjectById(id);
        if (!project.getCreatedBy().getEmail().equals(requesterEmail)) {
            throw new RuntimeException(
                    "Only project creator can delete this project");
        }
        projectRepository.delete(project);
    }
}