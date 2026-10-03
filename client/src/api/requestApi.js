import axiosClient from './axiosClient';

export const requestApi = {
  createRequest: (data) => axiosClient.post('/requests', data),
  getRequests: (params) => axiosClient.get('/requests', { params }),
  getMyRequests: () => axiosClient.get('/requests/my'),
  getRequestById: (id) => axiosClient.get(`/requests/${id}`),
  getMatches: (id) => axiosClient.get(`/requests/${id}/matches`),
  updateStatus: (id, status) => axiosClient.patch(`/requests/${id}/status`, { status }),
  pledgeDonation: (data) => axiosClient.post('/donations/pledge', data),
  completeDonation: (id) => axiosClient.patch(`/donations/${id}/complete`, {}),
  getDonationsByRequest: (id) => axiosClient.get(`/donations/request/${id}`),
  getDonationHistory: () => axiosClient.get('/donations/history'),
};
