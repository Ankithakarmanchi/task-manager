import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await getProjects();
      setProjects(response.data);
    } catch (error) {
      toast.error('Failed to load projects');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProject(formData);
      toast.success('Project created!');
      setShowForm(false);
      setFormData({ name: '', description: '' });
      fetchProjects();
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.navbar}>
        <h1 style={styles.logo}>TaskManager</h1>
        <div style={styles.navRight}>
          <span style={styles.welcome}>Welcome, {user?.name}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <h2 style={styles.pageTitle}>My Projects</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            style={styles.createBtn}
          >
            + New Project
          </button>
        </div>

        {showForm && (
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>Create New Project</h3>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="Project name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                style={styles.input}
                required
              />
              <textarea
                placeholder="Project description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                style={styles.textarea}
              />
              <div style={styles.formButtons}>
                <button type="submit" style={styles.submitBtn}
                  disabled={loading}>
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={styles.projectGrid}>
          {projects.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No projects yet.</p>
              <p style={styles.emptySubtext}>
                Create your first project to get started!
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                style={styles.projectCard}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <h3 style={styles.projectName}>{project.name}</h3>
                <p style={styles.projectDesc}>{project.description}</p>
                <p style={styles.projectMeta}>
                  Created by {project.createdBy?.name}
                </p>
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
  logo: { color: '#6366f1', margin: 0, fontSize: '24px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  welcome: { color: '#94a3b8', fontSize: '14px' },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  content: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  pageTitle: { color: '#f1f5f9', margin: 0, fontSize: '24px' },
  createBtn: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
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
  formButtons: { display: 'flex', gap: '12px' },
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
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  projectCard: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  projectName: { color: '#f1f5f9', margin: '0 0 8px 0', fontSize: '18px' },
  projectDesc: {
    color: '#94a3b8',
    margin: '0 0 16px 0',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  projectMeta: { color: '#475569', fontSize: '12px', margin: 0 },
  empty: { gridColumn: '1/-1', textAlign: 'center', padding: '60px' },
  emptyText: { color: '#94a3b8', fontSize: '18px', margin: '0 0 8px 0' },
  emptySubtext: { color: '#475569', fontSize: '14px', margin: 0 },
};

export default Dashboard;