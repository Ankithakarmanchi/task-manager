import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProjectById,
  getTasksByProject,
  createTask,
  updateTaskStatus,
  deleteTask,
  breakdownTask,
  getComments,
  addComment,
  deleteComment,
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  getAuditLogs
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Client from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const STATUS_COLORS = {
  TODO: '#f59e0b',
  IN_PROGRESS: '#6366f1',
  DONE: '#10b981',
};

const ROLE_BADGE_COLORS = {
  ADMIN: '#ef4444',
  MEMBER: '#6366f1',
  VIEWER: '#94a3b8',
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeEmail: '',
  });
  const [aiSubtasks, setAiSubtasks] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Comments state
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [commentsByTask, setCommentsByTask] = useState({});
  const [newCommentText, setNewCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Members state
  const [members, setMembers] = useState([]);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'MEMBER' });
  const [memberLoading, setMemberLoading] = useState(false);

  // Audit log (History) state
  const [expandedHistoryTaskId, setExpandedHistoryTaskId] = useState(null);
  const [auditLogsByTask, setAuditLogsByTask] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  // Role-based access: figure out the logged-in user's role in THIS project
  const myMembership = members.find((m) => m.email === user?.email);
  const myRole = myMembership?.role; // 'ADMIN' | 'MEMBER' | 'VIEWER' | undefined (still loading)
  const isAdmin = myRole === 'ADMIN';
  const canEdit = myRole === 'ADMIN' || myRole === 'MEMBER'; // Viewers can't create/update/delete/comment
  const isOwner = project?.createdBy?.email === user?.email; // creator of the project — highest authority

  // Can the current user manage (remove / change role of) this particular member?
  const canManageMember = (member) => {
    if (!isAdmin) return false;
    if (member.email === project?.createdBy?.email) return false; // owner is untouchable
    if (member.email === user?.email) return false; // can't manage yourself here
    if (member.role === 'ADMIN' && !isOwner) return false; // only owner can touch other admins
    return true;
  };

  //useEffect(() => {
    //fetchProject();
    //fetchTasks();
    //fetchMembers();
    //connectWebSocket();
  //}, [id]);

  const connectWebSocket = () => {
    //const socket = new SockJS('http://localhost:8081/ws');
    const socket = new SockJS(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8081'}/ws`);
    const stompClient = new Client.Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        stompClient.subscribe(`/topic/project/${id}`, (message) => {
          const notification = JSON.parse(message.body);
          toast.success(`Update: ${notification.type} - ${notification.title || ''}`);
          fetchTasks();
        });
      },
    });
    stompClient.activate();
    return () => stompClient.deactivate();
  };

  const fetchProject = async () => {
    try {
      const response = await getProjectById(id);
      setProject(response.data);
    } catch (error) {
      toast.error('Failed to load project');
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await getTasksByProject(id);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await getMembers(id);
      setMembers(response.data);
    } catch (error) {
      toast.error('Failed to load members');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberForm.email.trim()) {
      toast.error('Enter an email address');
      return;
    }
    setMemberLoading(true);
    try {
      await addMember(id, memberForm);
      toast.success('Member added!');
      setMemberForm({ email: '', role: 'MEMBER' });
      setShowMemberForm(false);
      fetchMembers();
    } catch (error) {
      const message = error.response?.data || 'Failed to add member';
      toast.error(typeof message === 'string' ? message : 'Failed to add member');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from this project?`)) return;
    try {
      await removeMember(id, member.id);
      toast.success('Member removed');
      fetchMembers();
    } catch (error) {
      const message = error.response?.data || 'Failed to remove member';
      toast.error(typeof message === 'string' ? message : 'Failed to remove member');
    }
  };

  const handleChangeRole = async (member, newRole) => {
    if (newRole === member.role) return;
    try {
      await updateMemberRole(id, member.id, newRole);
      toast.success(`${member.name} is now ${newRole}`);
      fetchMembers();
    } catch (error) {
      const message = error.response?.data || 'Failed to change role';
      toast.error(typeof message === 'string' ? message : 'Failed to change role');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTask({ ...taskForm, projectId: id });
      toast.success('Task created!');
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', assigneeEmail: '' });
      setAiSubtasks([]);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success('Status updated!');
      fetchTasks();
      if (expandedHistoryTaskId === taskId) {
        const response = await getAuditLogs(taskId);
        setAuditLogsByTask((prev) => ({ ...prev, [taskId]: response.data }));
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAiBreakdown = async () => {
    if (!taskForm.description) {
      toast.error('Enter a task description first');
      return;
    }
    setAiLoading(true);
    try {
      const response = await breakdownTask(taskForm.description);
      setAiSubtasks(response.data);
      toast.success('AI breakdown complete!');
    } catch (error) {
      toast.error('AI breakdown failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted!');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const toggleComments = async (taskId) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(taskId);
    try {
      const response = await getComments(taskId);
      setCommentsByTask((prev) => ({ ...prev, [taskId]: response.data }));
    } catch (error) {
      toast.error('Failed to load comments');
    }
  };

  const handleAddComment = async (taskId) => {
    if (!newCommentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    setCommentLoading(true);
    try {
      await addComment({ taskId, content: newCommentText });
      toast.success('Comment added!');
      setNewCommentText('');
      const response = await getComments(taskId);
      setCommentsByTask((prev) => ({ ...prev, [taskId]: response.data }));
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (taskId, commentId) => {
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted!');
      const response = await getComments(taskId);
      setCommentsByTask((prev) => ({ ...prev, [taskId]: response.data }));
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const toggleHistory = async (taskId) => {
    if (expandedHistoryTaskId === taskId) {
      setExpandedHistoryTaskId(null);
      return;
    }
    setExpandedHistoryTaskId(taskId);
    setHistoryLoading(true);
    try {
      const response = await getAuditLogs(taskId);
      setAuditLogsByTask((prev) => ({ ...prev, [taskId]: response.data }));
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div style={styles.container}>
      <div style={styles.navbar}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          ← Back
        </button>
        <h1 style={styles.logo}>TaskManager</h1>
        <div style={styles.navbarRight}>
          {myRole && (
            <span
              style={{
                ...styles.myRoleBadge,
                borderColor: ROLE_BADGE_COLORS[myRole],
                color: ROLE_BADGE_COLORS[myRole],
              }}
            >
              {myRole}
            </span>
          )}
          <span style={styles.welcome}>{user?.name}</span>
        </div>
      </div>

      <div style={styles.content}>
        {project && (
          <div style={styles.projectHeader}>
            <h2 style={styles.projectTitle}>{project.name}</h2>
            <p style={styles.projectDesc}>{project.description}</p>
          </div>
        )}

        <div style={styles.tasksHeader}>
          <h3 style={styles.sectionTitle}>Team Members</h3>
          {isAdmin && (
            <button
              onClick={() => setShowMemberForm(!showMemberForm)}
              style={styles.createBtn}
            >
              + Add Member
            </button>
          )}
        </div>

        {isAdmin && showMemberForm && (
          <div style={styles.formCard}>
            <h4 style={styles.formTitle}>Add Team Member</h4>
            <form onSubmit={handleAddMember}>
              <input
                type="email"
                placeholder="Member's email address"
                value={memberForm.email}
                onChange={(e) =>
                  setMemberForm({ ...memberForm, email: e.target.value })
                }
                style={styles.input}
                required
              />
              <select
                value={memberForm.role}
                onChange={(e) =>
                  setMemberForm({ ...memberForm, role: e.target.value })
                }
                style={{ ...styles.select, width: '100%', marginBottom: '12px' }}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MEMBER">MEMBER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
              <div style={styles.formButtons}>
                <button type="submit" style={styles.submitBtn} disabled={memberLoading}>
                  {memberLoading ? 'Adding...' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMemberForm(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={styles.memberList}>
          {members.length === 0 ? (
            <p style={styles.noComments}>No members yet.</p>
          ) : (
            members.map((member) => (
              <div key={member.id} style={styles.memberCard}>
                <span style={styles.memberName}>{member.name}</span>
                <span style={styles.memberEmail}>{member.email}</span>
                {member.email === project?.createdBy?.email && (
                  <span style={{ ...styles.memberRoleBadge, borderColor: '#f59e0b', color: '#f59e0b' }}>
                    OWNER
                  </span>
                )}
                {canManageMember(member) ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member, e.target.value)}
                      style={styles.select}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MEMBER">MEMBER</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member)}
                      style={styles.cancelBtn}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span style={styles.memberRoleBadge}>{member.role}</span>
                )}
              </div>
            ))
          )}
        </div>

        <div style={styles.tasksHeader}>
          <h3 style={styles.sectionTitle}>Tasks</h3>
          {canEdit && (
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              style={styles.createBtn}
            >
              + New Task
            </button>
          )}
        </div>

        {!canEdit && myRole === 'VIEWER' && (
          <p style={styles.viewerNotice}>
            👁️ You have Viewer access — you can see tasks, comments, and history, but can't create or edit anything.
          </p>
        )}

        {canEdit && showTaskForm && (
          <div style={styles.formCard}>
            <h4 style={styles.formTitle}>Create New Task</h4>
            <form onSubmit={handleCreateTask}>
              <input
                type="text"
                placeholder="Task title"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, title: e.target.value })
                }
                style={styles.input}
                required
              />
              <textarea
                placeholder="Task description (used for AI breakdown)"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
                style={styles.textarea}
              />
              <button
                type="button"
                onClick={handleAiBreakdown}
                style={styles.aiBtn}
                disabled={aiLoading}
              >
                {aiLoading ? 'Analyzing...' : '🤖 AI Breakdown'}
              </button>

              {aiSubtasks.length > 0 && (
                <div style={styles.aiResults}>
                  <p style={styles.aiTitle}>AI Suggested Subtasks:</p>
                  {aiSubtasks.map((subtask, index) => (
                    <div key={index} style={styles.subtask}>
                      ✓ {subtask}
                    </div>
                  ))}
                </div>
              )}

              <input
                type="email"
                placeholder="Assignee email (optional)"
                value={taskForm.assigneeEmail}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, assigneeEmail: e.target.value })
                }
                style={styles.input}
              />
              <div style={styles.formButtons}>
                <button type="submit" style={styles.submitBtn}
                  disabled={loading}>
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={styles.taskList}>
          {tasks.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No tasks yet. Create your first task!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} style={styles.taskCard}>
                <div style={styles.taskTop}>
                  <h4 style={styles.taskTitle}>{task.title}</h4>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: STATUS_COLORS[task.status],
                    }}
                  >
                    {task.status}
                  </span>
                </div>
                <p style={styles.taskDesc}>{task.description}</p>
                {task.assignedTo && (
                  <p style={styles.taskMeta}>
                    Assigned to: {task.assignedTo.name}
                  </p>
                )}
                <div style={styles.taskActions}>
                  <select
                    value={task.status}
                    onChange={(e) =>
                      handleStatusChange(task.id, e.target.value)
                    }
                    style={{
                      ...styles.select,
                      opacity: canEdit ? 1 : 0.5,
                      cursor: canEdit ? 'pointer' : 'not-allowed',
                    }}
                    disabled={!canEdit}
                    title={!canEdit ? "Viewers can't change task status" : ''}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                  <button
                    onClick={() => toggleComments(task.id)}
                    style={styles.commentBtn}
                  >
                    💬 Comments {commentsByTask[task.id] ? `(${commentsByTask[task.id].length})` : ''}
                  </button>
                  <button
                    onClick={() => toggleHistory(task.id)}
                    style={styles.commentBtn}
                  >
                    📜 History {auditLogsByTask[task.id] ? `(${auditLogsByTask[task.id].length})` : ''}
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  )}
                </div>

                {expandedTaskId === task.id && (
                  <div style={styles.commentsSection}>
                    {(commentsByTask[task.id] || []).length === 0 ? (
                      <p style={styles.noComments}>No comments yet.</p>
                    ) : (
                      commentsByTask[task.id].map((comment) => (
                        <div key={comment.id} style={styles.commentItem}>
                          <div style={styles.commentHeader}>
                            <span style={styles.commentAuthor}>
                              {comment.user?.name}
                            </span>
                            {comment.user?.email === user?.email && (
                              <button
                                onClick={() => handleDeleteComment(task.id, comment.id)}
                                style={styles.commentDeleteBtn}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <p style={styles.commentContent}>{comment.content}</p>
                        </div>
                      ))
                    )}

                    {canEdit ? (
                      <div style={styles.addCommentRow}>
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          style={styles.commentInput}
                        />
                        <button
                          onClick={() => handleAddComment(task.id)}
                          style={styles.commentSubmitBtn}
                          disabled={commentLoading}
                        >
                          {commentLoading ? '...' : 'Post'}
                        </button>
                      </div>
                    ) : (
                      <p style={styles.viewerNoticeSmall}>
                        👁️ Viewers can't post comments.
                      </p>
                    )}
                  </div>
                )}

                {expandedHistoryTaskId === task.id && (
                  <div style={styles.commentsSection}>
                    {historyLoading ? (
                      <p style={styles.noComments}>Loading history...</p>
                    ) : (auditLogsByTask[task.id] || []).length === 0 ? (
                      <p style={styles.noComments}>No status changes yet.</p>
                    ) : (
                      auditLogsByTask[task.id].map((logEntry) => (
                        <div key={logEntry.id} style={styles.historyItem}>
                          <span style={styles.historyDot} />
                          <div style={styles.historyContent}>
                            <p style={styles.historyText}>
                              <span style={styles.historyAuthor}>{logEntry.changedByName}</span>
                              {' changed status from '}
                              <span
                                style={{
                                  ...styles.historyStatusBadge,
                                  backgroundColor: STATUS_COLORS[logEntry.oldStatus],
                                }}
                              >
                                {logEntry.oldStatus}
                              </span>
                              {' to '}
                              <span
                                style={{
                                  ...styles.historyStatusBadge,
                                  backgroundColor: STATUS_COLORS[logEntry.newStatus],
                                }}
                              >
                                {logEntry.newStatus}
                              </span>
                            </p>
                            <p style={styles.historyTimestamp}>
                              {formatTimestamp(logEntry.changedAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0f172a' },
  navbar: {
    backgroundColor: '#1e293b',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
  },
  navbarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  backBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  logo: { color: '#6366f1', margin: 0, fontSize: '24px' },
  welcome: { color: '#94a3b8', fontSize: '14px' },
  myRoleBadge: {
    backgroundColor: '#0f172a',
    border: '1px solid',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  content: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
  projectHeader: { marginBottom: '32px' },
  projectTitle: { color: '#f1f5f9', margin: '0 0 8px 0', fontSize: '28px' },
  projectDesc: { color: '#94a3b8', margin: 0, fontSize: '16px' },
  tasksHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: { color: '#f1f5f9', margin: 0, fontSize: '20px' },
  createBtn: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  viewerNotice: {
    color: '#94a3b8',
    fontSize: '13px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '20px',
  },
  viewerNoticeSmall: {
    color: '#475569',
    fontSize: '12px',
    marginTop: '12px',
  },
  formCard: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    border: '1px solid #334155',
  },
  formTitle: { color: '#f1f5f9', marginTop: 0 },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
    minHeight: '80px',
    resize: 'vertical',
  },
  aiBtn: {
    backgroundColor: '#0f172a',
    border: '1px solid #6366f1',
    color: '#6366f1',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '12px',
    fontSize: '14px',
  },
  aiResults: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  aiTitle: { color: '#6366f1', margin: '0 0 12px 0', fontSize: '14px' },
  subtask: {
    color: '#94a3b8',
    fontSize: '14px',
    padding: '6px 0',
    borderBottom: '1px solid #1e293b',
  },
  formButtons: { display: 'flex', gap: '12px', marginTop: '12px' },
  submitBtn: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  taskList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  taskCard: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  taskTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  taskTitle: { color: '#f1f5f9', margin: 0, fontSize: '16px' },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  taskDesc: { color: '#94a3b8', margin: '0 0 8px 0', fontSize: '14px' },
  taskMeta: { color: '#475569', fontSize: '12px', margin: '0 0 12px 0' },
  taskActions: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  select: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  commentBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  empty: { textAlign: 'center', padding: '40px' },
  emptyText: { color: '#94a3b8', fontSize: '16px' },

  commentsSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #334155',
  },
  noComments: {
    color: '#475569',
    fontSize: '13px',
    marginBottom: '12px',
  },
  commentItem: {
    backgroundColor: '#0f172a',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    color: '#6366f1',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  commentDeleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '12px',
  },
  commentContent: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: '4px 0 0 0',
  },
  addCommentRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  commentInput: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
  },
  commentSubmitBtn: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '32px',
  },
  memberCard: {
    backgroundColor: '#1e293b',
    padding: '14px 20px',
    borderRadius: '10px',
    border: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  memberName: { color: '#f1f5f9', fontWeight: 'bold', fontSize: '14px', minWidth: '120px' },
  memberEmail: { color: '#94a3b8', fontSize: '14px', flex: 1 },
  memberRoleBadge: {
    backgroundColor: '#0f172a',
    color: '#6366f1',
    border: '1px solid #6366f1',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  historyItem: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  historyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    marginTop: '6px',
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    color: '#cbd5e1',
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.6',
  },
  historyAuthor: {
    color: '#f1f5f9',
    fontWeight: 'bold',
  },
  historyStatusBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  historyTimestamp: {
    color: '#475569',
    fontSize: '11px',
    margin: '2px 0 0 0',
  },
};

export default ProjectDetail;