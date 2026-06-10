import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const getTeams       = () => API.get('/teams');
export const getMembers     = () => API.get('/members');
export const getProjects    = () => API.get('/projects');
export const getAllocations  = () => API.get('/allocations');
export const getCapacity    = () => API.get('/allocations/capacity');
export const createMember   = (data) => API.post('/members', data);
export const createProject  = (data) => API.post('/projects', data);
export const createAllocation = (data) => API.post('/allocations', data);
export const deleteAllocation = (id) => API.delete(`/allocations/${id}`);