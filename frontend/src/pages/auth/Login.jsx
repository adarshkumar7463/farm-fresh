import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../store/slices/authSlice.js';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password, rememberMe })).then((res) => {
      if (!res.error) {
        if (!res.payload.isEmailVerified) {
          navigate('/verify-otp', { state: { email } });
        } else if (res.payload.role === 'supplier') {
          navigate('/supplier/dashboard');
        } else {
          navigate('/marketplace');
        }
      }
    });
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/v1/auth/google';
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 px-3">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-farm glass-panel p-4 p-md-5 w-100" 
        style={{ maxWidth: '450px' }}
      >
        <div className="text-center mb-4">
          <div className="gradient-bg text-white rounded-circle d-inline-flex p-3 mb-3">
            <Leaf size={32} />
          </div>
          <h2 className="fw-bold text-dark">Welcome Back</h2>
          <p className="text-muted">Sign in to manage your orders & inventory</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 rounded-3 text-center py-2" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-dark fw-semibold">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 text-success">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="form-control border-start-0 ps-0"
                placeholder="name@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-dark fw-semibold">Password</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 text-success">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="form-control border-start-0 ps-0"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input text-success"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label className="form-check-label text-muted" htmlFor="remember" style={{ fontSize: '14px' }}>
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-success text-decoration-none fw-semibold" style={{ fontSize: '14px' }}>
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary-farm w-100 py-2.5 mb-3 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <button 
          onClick={handleGoogleLogin} 
          className="btn btn-light border w-100 py-2.5 rounded-3 d-flex align-items-center justify-content-center gap-2 mb-4 fw-semibold"
        >
          <img src="https://docs.microsoft.com/en-us/azure/active-directory/develop/media/howto-add-branding-in-azure-ad-apps/google-logo.svg" alt="Google logo" width="18" height="18" />
          Continue with Google
        </button>

        <div className="text-center text-muted" style={{ fontSize: '14px' }}>
          Don't have an account?{' '}
          <Link to="/register" className="text-success text-decoration-none fw-bold">
            Sign Up
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
