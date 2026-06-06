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

      <button
  onClick={handleLogout}
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(220, 53, 69, 0.35)',
    background: 'rgba(220, 53, 69, 0.08)',
    color: '#dc3545',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 0.18s ease, border-color 0.18s ease',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = 'rgba(220, 53, 69, 0.15)';
    e.currentTarget.style.borderColor = 'rgba(220, 53, 69, 0.55)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = 'rgba(220, 53, 69, 0.08)';
    e.currentTarget.style.borderColor = 'rgba(220, 53, 69, 0.35)';
  }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
  Log Out
</button>
    </div>
  );
};

export default Sidebar;
