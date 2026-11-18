import axiosClient from './axiosClient';

export const donorApi = {
  getProfile: () => axiosClient.get('/donors/profile'),
  updateProfile: (data) => axiosClient.put('/donors/profile', data),
  getBadges: () => axiosClient.get('/donors/badges'),
  searchDonors: (params) => axiosClient.get('/donors/search', { params }),
  getAllDonors: () => axiosClient.get('/donors/all'),
};
