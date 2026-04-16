/**
 * notificationSlice.js
 * Manages the notification bell state.
 * Items are loaded from /api/notifications on mount.
 * New items arrive via Socket.IO 'notification' event.
 */

import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items:       [],
    unreadCount: 0,
    loading:     false,
  },
  reducers: {
    /** Replace the full list (called on initial load) */
    setNotifications: (state, action) => {
      state.items       = action.payload.notifications ?? [];
      state.unreadCount = action.payload.unreadCount   ?? 0;
    },

    /** Prepend a new notification (called from Socket.IO handler) */
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },

    /** Mark a single notification as read */
    markRead: (state, action) => {
      const n = state.items.find((i) => i._id === action.payload);
      if (n && !n.isRead) {
        n.isRead      = true;
        n.readAt      = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    /** Mark all notifications as read */
    markAllRead: (state) => {
      state.items.forEach((i) => { i.isRead = true; });
      state.unreadCount = 0;
    },

    /** Remove a notification from the list */
    removeNotification: (state, action) => {
      const idx = state.items.findIndex((i) => i._id === action.payload);
      if (idx !== -1) {
        if (!state.items[idx].isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.items.splice(idx, 1);
      }
    },

    /** Clear all notifications */
    clearNotifications: (state) => {
      state.items       = [];
      state.unreadCount = 0;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
