import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/slices/uiSlice.js';
import { logoutUser } from '../../store/slices/authSlice.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Bell, LogOut, User } from 'lucide-react';
import api from '../../api/api.js';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { unreadNotificationsCount, notifications } = useSelector((state) => state.ui);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      navigate('/login');
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      dispatch({ type: 'ui/markAllNotificationsRead' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg glass-panel px-4 py-2 mb-4 sticky-top">
      <div className="container-fluid d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <button
            className="btn btn-link text-success p-0 me-3 d-lg-block"
            onClick={() => dispatch(toggleSidebar())}
          >
            <Menu size={24} />
          </button>
          <Link to="/" className="navbar-brand d-flex align-items-center me-0">
            <span className="fs-4 fw-bold gradient-text">FarmFlow</span>
          </Link>
        </div>

        <div className="d-flex align-items-center gap-3">
          {/* Theme Switcher */}
          <button className="btn btn-outline-success border-0 rounded-circle p-2" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notifications Dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-outline-success border-0 rounded-circle p-2 position-relative"
              type="button"
              id="notificationsDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <Bell size={20} />
              {unreadNotificationsCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <ul className="dropdown-menu dropdown-menu-end p-2 border-0 shadow-lg card-farm" style={{ width: '300px' }} aria-labelledby="notificationsDropdown">
              <li className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                <span className="fw-bold">Notifications</span>
                {unreadNotificationsCount > 0 && (
                  <button className="btn btn-link text-success text-decoration-none p-0 btn-sm" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </li>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <li className="text-center text-muted py-3">No notifications</li>
                ) : (
                  notifications.map((n) => (
                    <li key={n._id} className={`p-2 rounded my-1 border-bottom ${n.status.isRead ? '' : 'bg-success-subtle'}`}>
                      <div className="fw-semibold text-success" style={{ fontSize: '14px' }}>{n.title}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{n.message}</div>
                    </li>
                  ))
                )}
              </div>
            </ul>
          </div>

          {/* User Profile Dropdown */}
          <div className="dropdown">
            <button
              className="btn d-flex align-items-center gap-2 border-0 p-1"
              type="button"
              id="userProfileDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="rounded-circle" width="36" height="36" />
              ) : (
                <div className="gradient-bg text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
                  {user?.firstName?.charAt(0)}
                </div>
              )}
              <div className="text-start d-none d-md-block">
                <div className="fw-semibold text-dark leading-none" style={{ fontSize: '14px' }}>{user?.fullName}</div>
                <div className="text-muted text-capitalize" style={{ fontSize: '11px' }}>{user?.role}</div>
              </div>
            </button>
            <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg card-farm p-1" aria-labelledby="userProfileDropdown">
              <li>
                <Link className="dropdown-item rounded d-flex align-items-center gap-2 py-2" to="/profile">
                  <User size={16} /> Profile Settings
                </Link>
              </li>
              <li>
                <button className="dropdown-item rounded text-danger d-flex align-items-center gap-2 py-2" onClick={handleLogout}>
                  <LogOut size={16} /> Log Out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
