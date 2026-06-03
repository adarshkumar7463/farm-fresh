import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/api.js';

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/cart');
    return response.data.data.cart;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
  }
});

export const addItemToCart = createAsyncThunk('cart/addItem', async ({ productId, quantity }, { rejectWithValue }) => {
  try {
    const response = await api.post('/cart', { productId, quantity });
    return response.data.data.cart;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to add item to cart');
  }
});

export const updateItemQuantity = createAsyncThunk('cart/updateItem', async ({ itemId, quantity }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/cart/items/${itemId}`, { quantity });
    return response.data.data.cart;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update item quantity');
  }
});

export const removeItemFromCart = createAsyncThunk('cart/removeItem', async (itemId, { rejectWithValue }) => {
  try {
    const response = await api.delete(`/cart/items/${itemId}`);
    return response.data.data.cart;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to remove item');
  }
});

export const clearUserCart = createAsyncThunk('cart/clear', async (_, { rejectWithValue }) => {
  try {
    const response = await api.delete('/cart');
    return response.data.data.cart;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to clear cart');
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cart: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type.startsWith('cart/') && action.type.endsWith('/pending'),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('cart/') && action.type.endsWith('/fulfilled'),
        (state, action) => {
          state.loading = false;
          state.cart = action.payload;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('cart/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export default cartSlice.reducer;
