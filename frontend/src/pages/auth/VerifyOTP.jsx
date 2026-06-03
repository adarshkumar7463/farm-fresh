import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/api.js';
import { Leaf, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const email = location.state?.email || '';

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-email', {
        email,
        otp,
        purpose: 'email_verification',
      });
      if (response.data.success) {
        alert('Email verified successfully! You can now log in.');
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-verification', { email });
      alert('Verification OTP sent successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resend OTP');
    }
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
          <h2 className="fw-bold text-dark">Verify Email</h2>
          <p className="text-muted">Enter the 6-digit OTP code sent to {email}</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 rounded-3 text-center py-2" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="mb-4">
            <input
              type="text"
              maxLength="6"
              className="form-control text-center fs-3 fw-bold tracking-widest border border-success"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary-farm w-100 py-2.5 mb-3 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <>
                <CheckCircle size={18} />
                Verify OTP
              </>
            )}
          </button>
        </form>

        <button onClick={handleResend} className="btn btn-link text-success text-decoration-none w-100 fw-bold">
          Resend verification email
        </button>
      </motion.div>
    </div>
  );
};

export default VerifyOTP;
