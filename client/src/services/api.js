import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Auto-attach token to every request
API.interceptors.request.use(config => {
  const token = localStorage.getItem('bsx_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


// Auto-logout on 401
API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bsx_token');
      localStorage.removeItem('bsx_user');
      window.location.href = '/';
    }
    console.error("API Error:", err.response?.data?.message || err.message);
    return Promise.reject(err);
  }
);

export const getPendingProgressUpdates = ()          => API.get('/tasks/progress/pending');
export const createBulkMembers         = (data)      => API.post('/members/bulk', data);
export const submitTaskProgress   = (id, data) => API.post(`/tasks/${id}/progress`, data);
export const getPendingProgress   = ()          => API.get('/tasks/progress/pending');
export const reviewProgressUpdate = (id, data)  => API.put(`/tasks/progress/${id}/review`, data);
export const getProgressHistory   = (id)        => API.get(`/tasks/${id}/progress/history`);
// Auth
export const login          = (data) => API.post('/auth/login', data);
export const register       = (data) => API.post('/auth/register', data);
export const getMe          = ()     => API.get('/auth/me');
export const getUsers       = ()     => API.get('/auth/users');
export const toggleUser     = (id)   => API.put(`/auth/users/${id}/toggle`);

// Core
export const getTeams       = () => API.get('/teams');
export const getMembers     = () => API.get('/members');
export const getProjects    = () => API.get('/projects');
export const getAllocations  = () => API.get('/allocations');
export const getCapacity    = () => API.get('/allocations/capacity');
export const getTasks       = () => API.get('/tasks');
export const getRequests    = () => API.get('/requests');
export const getNotifications = () => API.get('/notifications');

export const createMember     = (data) => API.post('/members', data);
export const createProject    = (data) => API.post('/projects', data);
export const createAllocation = (data) => API.post('/allocations', data);
export const createTask       = (data) => API.post('/tasks', data);
export const createRequest    = (data) => API.post('/requests', data);

export const updateTask       = (id, data) => API.put(`/tasks/${id}`, data);
export const updateAllocation = (id, data) => API.put(`/allocations/${id}`, data);
export const updateRequest    = (id, data) => API.put(`/requests/${id}`, data);
export const updateProject    = (id, data) => API.put(`/projects/${id}`, data);
export const updateMember     = (id, data) => API.put(`/members/${id}`, data);

export const deleteAllocation = (id) => API.delete(`/allocations/${id}`);
export const deleteTask       = (id) => API.delete(`/tasks/${id}`);
export const deleteMember     = (id) => API.delete(`/members/${id}`);
export const deleteProject    = (id) => API.delete(`/projects/${id}`);

export const getAISuggestion  = (data) => API.post('/ai/suggest', data);