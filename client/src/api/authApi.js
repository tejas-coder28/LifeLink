import axiosClient from './axiosClient';

export const authApi = {
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  register: (userData) => axiosClient.post('/auth/register', userData),
  loginWithGoogle: (payload) => axiosClient.post('/auth/google', payload),
  getMe: () => axiosClient.get('/auth/me'),
};

export default authApi;
