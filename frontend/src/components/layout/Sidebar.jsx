import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../store/slices/authSlice.js';
import { 
  LayoutDashboard, 
  Leaf, 
  ShoppingBag, 
  ShoppingCart, 
  FileText, 
  TrendingUp, 
  UserCircle,
  LogOut
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (!sidebarOpen) return null;

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate('/login');
    });
  };

  return (
    <div className="glass-panel d-flex flex-column p-3 sticky-top" style={{ width: '260px', height: '100vh', borderRight: '1px solid var(--border-color)', borderRadius: '0 16px 16px 0', zIndex: 100 }}>
      <div className="d-flex align-items-center gap-2 mb-4 px-2">
        <Leaf className="text-success" size={28} />
        <span className="fs-4 fw-bold gradient-text">FarmFlow</span>
      </div>

      <div className="nav flex-column gap-2 flex-grow-1" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {user?.role === 'supplier' ? (
          <>
            <NavLink to="/supplier/dashboard" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink to="/supplier/inventory" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
              <ShoppingBag size={20} />
              Inventory
            </NavLink>
            <NavLink to="/supplier/orders" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
              <ShoppingCart size={20} />
              Orders
            </NavLink>
            <NavLink to="/supplier/reports" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
              <TrendingUp size={20} />
              Analytics & Reports
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/marketplace" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
              <ShoppingBag size={20} />
              Marketplace
            </NavLink>
            <NavLink to="/cart" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
              <ShoppingCart size={20} />
              My Cart
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
              <FileText size={20} />
              My Orders
            </NavLink>
          </>
        )}

        <div className="border-top my-3" />

        <NavLink to="/profile" className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-decoration-none fw-semibold transition-all ${isActive ? 'gradient-bg text-white shadow-sm' : 'text-success hover:bg-success-subtle'}`}>
          <UserCircle size={20} />
          Profile
        </NavLink>
      </div>

      <div className="mt-auto pt-3 border-top w-100 bg-white">
        <button
          onClick={handleLogout}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2.5 rounded-3 fw-bold border-0 bg-transparent transition-all hover:bg-danger-subtle text-danger text-start"
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
