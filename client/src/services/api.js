import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export const getTeams        = () => API.get('/teams');
export const getMembers      = () => API.get('/members');
export const getProjects     = () => API.get('/projects');
export const getAllocations   = () => API.get('/allocations');
export const getCapacity     = () => API.get('/allocations/capacity');
export const getTasks        = () => API.get('/tasks');
export const getRequests     = () => API.get('/requests');

export const createMember      = (data) => API.post('/members', data);
export const createProject     = (data) => API.post('/projects', data);
export const createAllocation  = (data) => API.post('/allocations', data);
export const createTask        = (data) => API.post('/tasks', data);
export const createRequest     = (data) => API.post('/requests', data);

export const updateTask        = (id, data) => API.put(`/tasks/${id}`, data);
export const updateAllocation  = (id, data) => API.put(`/allocations/${id}`, data);
export const updateRequest     = (id, data) => API.put(`/requests/${id}`, data);

export const deleteAllocation  = (id) => API.delete(`/allocations/${id}`);
export const deleteTask        = (id) => API.delete(`/tasks/${id}`);

export const getAISuggestion   = (data) => API.post('/ai/suggest', data);