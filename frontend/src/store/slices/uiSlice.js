import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    notifications: [],
    unreadNotificationsCount: 0,
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    setNotifications(state, action) {
      state.notifications = action.payload;
    },
    addNotification(state, action) {
      state.notifications.unshift(action.payload);
      state.unreadNotificationsCount += 1;
    },
    setUnreadNotificationsCount(state, action) {
      state.unreadNotificationsCount = action.payload;
    },
    markNotificationRead(state, action) {
      const notif = state.notifications.find((n) => n._id === action.payload);
      if (notif && !notif.status.isRead) {
        notif.status.isRead = true;
        state.unreadNotificationsCount = Math.max(0, state.unreadNotificationsCount - 1);
      }
    },
    markAllNotificationsRead(state) {
      state.notifications.forEach((n) => {
        n.status.isRead = true;
      });
      state.unreadNotificationsCount = 0;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setNotifications,
  addNotification,
  setUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
} = uiSlice.actions;

export default uiSlice.reducer;
