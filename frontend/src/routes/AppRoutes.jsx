import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Auth Pages
import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import VerifyOTP from '../pages/auth/VerifyOTP.jsx';

// Supplier Pages
import SupplierDashboard from '../pages/supplier/Dashboard.jsx';
import SupplierInventory from '../pages/supplier/Inventory.jsx';
import SupplierOrders from '../pages/supplier/Orders.jsx';
import SupplierReports from '../pages/supplier/Reports.jsx';

// Buyer Pages
import BuyerMarketplace from '../pages/buyer/Marketplace.jsx';
import BuyerCart from '../pages/buyer/Cart.jsx';
import BuyerOrders from '../pages/buyer/Orders.jsx';

// Shared Pages
import Profile from '../pages/shared/Profile.jsx';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'supplier' ? '/supplier/dashboard' : '/marketplace'} replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={user.role === 'supplier' ? '/supplier/dashboard' : '/marketplace'} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to={user.role === 'supplier' ? '/supplier/dashboard' : '/marketplace'} replace />
          ) : (
            <Register />
          )
        }
      />
      <Route path="/verify-otp" element={<VerifyOTP />} />

      {/* Supplier Routes */}
      <Route
        path="/supplier/dashboard"
        element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supplier/inventory"
        element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierInventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supplier/orders"
        element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supplier/reports"
        element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <SupplierReports />
          </ProtectedRoute>
        }
      />

      {/* Buyer Routes */}
      <Route
        path="/marketplace"
        element={
          <ProtectedRoute allowedRoles={['buyer']}>
            <BuyerMarketplace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedRoute allowedRoles={['buyer']}>
            <BuyerCart />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute allowedRoles={['buyer']}>
            <BuyerOrders />
          </ProtectedRoute>
        }
      />

      {/* Shared Protected Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Fallback Redirect */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? (user.role === 'supplier' ? '/supplier/dashboard' : '/marketplace') : '/login'} replace />
        }
      />
    </Routes>
  );
};

export default AppRoutes;
