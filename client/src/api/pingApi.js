import axiosClient from './axiosClient';

export const pingApi = {
  notifyDonor: (requestId, donorId) => axiosClient.post(`/requests/${requestId}/notify/${donorId}`),
  getRequestPings: (requestId) => axiosClient.get(`/requests/${requestId}/pings`),
  getPendingPings: () => axiosClient.get('/pings/pending'),
  respondToPing: (pingId, decision) => axiosClient.patch(`/pings/${pingId}/respond`, { decision }),
};
