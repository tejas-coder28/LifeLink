import axiosClient from './axiosClient';

export const requestApi = {
  createRequest: (data) => axiosClient.post('/requests', data),
  getRequests: (params) => axiosClient.get('/requests', { params }),
  getMyRequests: () => axiosClient.get('/requests/my'),
  getRequestById: (id) => axiosClient.get(`/requests/${id}`),
  getMatches: (id) => axiosClient.get(`/requests/${id}/matches`),
  updateStatus: (id, status) => axiosClient.patch(`/requests/${id}/status`, { status }),
  getIncomingHospitalRequests: () => axiosClient.get('/requests/hospital/incoming'),
  acceptRequest: (id) => axiosClient.patch(`/requests/${id}/accept`),
  rejectRequest: (id, reason) => axiosClient.patch(`/requests/${id}/reject`, { reason }),
  issueCompatibleUnits: (id, bloodGroup, units) => axiosClient.post(`/requests/${id}/issue-compatible`, { bloodGroup, units }),
  issuePatientUnits: (id, units = 1) => axiosClient.post(`/requests/${id}/issue-patient`, { units }),
  pledgeDonation: (data) => axiosClient.post('/donations/pledge', data),
  completeDonation: (id) => axiosClient.patch(`/donations/${id}/complete`, {}),
  declineDonation: (id) => axiosClient.patch(`/donations/${id}/decline`, {}),
  getHospitalPledges: () => axiosClient.get('/donations/hospital'),
  getDonationsByRequest: (id) => axiosClient.get(`/donations/request/${id}`),
  getDonationHistory: () => axiosClient.get('/donations/history'),
};
