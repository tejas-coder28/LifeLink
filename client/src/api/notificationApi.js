import axiosClient from './axiosClient';

export const notificationApi = {
  getMyNotifications: () => axiosClient.get('/notifications/my'),
  markRead: (id) => axiosClient.patch(`/notifications/${id}/read`),
};

export default notificationApi;
