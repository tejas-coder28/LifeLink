import axiosClient from './axiosClient';

export const hospitalApi = {
  getProfile: () => axiosClient.get('/hospitals/profile'),
  getAllHospitals: () => axiosClient.get('/hospitals/all'),
  getVerifiedHospitals: () => axiosClient.get('/hospitals/verified'),
  updateInventory: (inventory) => axiosClient.put('/hospitals/inventory', { inventory }),
  getInventoryTransactions: () => axiosClient.get('/hospitals/inventory/transactions'),
  // Admin: approve or reject a hospital
  verifyHospital: (id, isVerified) => axiosClient.patch(`/hospitals/${id}/verify`, { isVerified }),
  // Admin: delete a hospital record
  deleteHospital: (id) => axiosClient.delete(`/hospitals/${id}`),
};

export default hospitalApi;

