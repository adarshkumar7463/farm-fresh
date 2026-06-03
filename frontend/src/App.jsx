import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store/index.js';
import { loadCurrentUser } from './store/slices/authSlice.js';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import './App.css';

const queryClient = new QueryClient();

// Session loader component to fetch user info on mount
const SessionLoader = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      dispatch(loadCurrentUser());
    }
  }, [dispatch]);

  return children;
};

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SocketProvider>
            <BrowserRouter>
              <SessionLoader>
                <AppRoutes />
              </SessionLoader>
            </BrowserRouter>
          </SocketProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
