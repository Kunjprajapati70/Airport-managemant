/**
 * authSlice.js
 * Redux slice for authentication state.
 *
 * State shape:
 *   user            - full user object from /api/auth/me
 *   token           - JWT string (persisted in localStorage)
 *   isAuthenticated - boolean
 *   loading         - boolean (for login/register spinners)
 *   error           - string | null (shown as toast)
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { disconnectSocket } from '../../services/socket';

// ── Async thunks ──────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('token', data.token);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      localStorage.setItem('token', data.token);
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  }
);

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || 'Session expired.'
      );
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Update failed.');
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:            null,
    token:           localStorage.getItem('token') || null,
    isAuthenticated: false,
    loading:         false,
    error:           null,
  },
  reducers: {
    logout: (state) => {
      state.user            = null;
      state.token           = null;
      state.isAuthenticated = false;
      state.error           = null;
      localStorage.removeItem('token');
      disconnectSocket();
    },
    clearError: (state) => {
      state.error = null;
    },
    // Optimistically update user fields (e.g. after profile edit)
    patchUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // ── login ──────────────────────────────────────────────────────────────
    builder
      .addCase(login.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(login.fulfilled, (s, a) => {
        s.loading         = false;
        s.user            = a.payload.user;
        s.token           = a.payload.token;
        s.isAuthenticated = true;
      })
      .addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    // ── register ───────────────────────────────────────────────────────────
    builder
      .addCase(register.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(register.fulfilled, (s, a) => {
        s.loading         = false;
        s.user            = a.payload.user;
        s.token           = a.payload.token;
        s.isAuthenticated = true;
      })
      .addCase(register.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });

    // ── getMe ──────────────────────────────────────────────────────────────
    builder
      .addCase(getMe.pending,   (s) => { s.loading = true; })
      .addCase(getMe.fulfilled, (s, a) => {
        s.loading         = false;
        s.user            = a.payload.user;
        s.isAuthenticated = true;
      })
      .addCase(getMe.rejected,  (s) => {
        // Token invalid / expired — clear everything
        s.loading         = false;
        s.user            = null;
        s.token           = null;
        s.isAuthenticated = false;
        localStorage.removeItem('token');
      });

    // ── updateProfile ──────────────────────────────────────────────────────
    builder
      .addCase(updateProfile.fulfilled, (s, a) => {
        if (s.user) s.user = { ...s.user, ...a.payload.user };
      });
  },
});

export const { logout, clearError, patchUser } = authSlice.actions;
export default authSlice.reducer;
