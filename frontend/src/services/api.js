import axios from 'axios';

//const API_BASE_URL = 'http://localhost:8081/api';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically add JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth APIs
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);

// Project APIs
export const createProject = (data) => api.post('/projects', data);
export const getProjects = () => api.get('/projects');
export const getProjectById = (id) => api.get(`/projects/${id}`);
export const addMember = (id, data) => api.post(`/projects/${id}/members`, data);
export const getMembers = (id) => api.get(`/projects/${id}/members`);
export const removeMember = (id, memberId) => api.delete(`/projects/${id}/members/${memberId}`);
export const updateMemberRole = (id, memberId, role) => api.patch(`/projects/${id}/members/${memberId}/role`, { role });
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Task APIs
export const createTask = (data) => api.post('/tasks', data);
export const getTasksByProject = (projectId) => api.get(`/tasks/project/${projectId}`);
export const getMyTasks = () => api.get('/tasks/my-tasks');
export const updateTaskStatus = (id, status) => api.patch(`/tasks/${id}/status`, { status });
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Comment APIs
export const addComment = (data) => api.post('/comments', data);
export const getComments = (taskId) => api.get(`/comments/task/${taskId}`);
// Audit Log APIs
export const getAuditLogs = (taskId) => api.get(`/tasks/${taskId}/audit-logs`);
export const deleteComment = (id) => api.delete(`/comments/${id}`);

// AI APIs
export const breakdownTask = (description) => api.post('/ai/breakdown', { description });

export default api;