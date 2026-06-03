import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../store/slices/authSlice.js';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, User, Phone, Store, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('hotel');
  const [gstNumber, setGstNumber] = useState('');

  // Local validation errors
  const [localErrors, setLocalErrors] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, validationErrors = [] } = useSelector((state) => state.auth);

  // Email format validator
  const validateEmail = (email) => {
    return /^\S+@\S+\.\S+$/.test(email);
  };

  // Indian phone number validator (10 digits, starts with 6-9)
  const validatePhone = (phone) => {
    return /^[6-9]\d{9}$/.test(phone);
  };

  // Password strength: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
  const validatePassword = (pass) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pass);
  };

  const handleFieldChange = (field, value, validatorFn, errorMsg) => {
    if (field === 'firstName') setFirstName(value);
    else if (field === 'lastName') setLastName(value);
    else if (field === 'email') setEmail(value);
    else if (field === 'phone') setPhone(value);
    else if (field === 'password') setPassword(value);
    else if (field === 'confirmPassword') setConfirmPassword(value);
    else if (field === 'businessName') setBusinessName(value);
    else if (field === 'gstNumber') setGstNumber(value);

    // Validate in real-time
    if (validatorFn) {
      if (!value || !validatorFn(value)) {
        setLocalErrors((prev) => ({ ...prev, [field]: errorMsg }));
      } else {
        setLocalErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    } else {
      // Clear error for basic fields when user types
      if (value.trim()) {
        setLocalErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    
    if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (phone && !validatePhone(phone)) {
      errors.phone = 'Please enter a valid 10-digit Indian phone number starting with 6-9';
    }

    if (!validatePassword(password)) {
      errors.password = 'Password must contain at least 8 characters, with uppercase, lowercase, number and special character (e.g. FarmFlow@123)';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!businessName.trim()) {
      errors.businessName = 'Business name is required';
    }

    if (role === 'supplier' && gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(gstNumber)) {
      errors.gstNumber = 'Please enter a valid GST number format (e.g. 22AAAAA0000A1Z5)';
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      role,
      businessInfo: {
        businessName,
        businessType: role === 'supplier' ? 'supplier' : businessType,
        gstNumber: role === 'supplier' ? gstNumber || undefined : undefined,
      },
    };

    dispatch(registerUser(payload)).then((res) => {
      if (!res.error) {
        navigate('/verify-otp', { state: { email } });
      }
    });
  };

  // Combine backend validation errors and local state validation errors
  const getFieldError = (fieldName) => {
    if (localErrors[fieldName]) return localErrors[fieldName];
    // Map backend response fields like "businessInfo.businessName" or "phone"
    const backendError = validationErrors.find(
      (e) => e.field === fieldName || e.field === `businessInfo.${fieldName}`
    );
    return backendError?.message;
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 py-5 px-3">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-farm glass-panel p-4 p-md-5 w-100" 
        style={{ maxWidth: '600px' }}
      >
        <div className="text-center mb-4">
          <div className="gradient-bg text-white rounded-circle d-inline-flex p-3 mb-3">
            <Leaf size={32} />
          </div>
          <h2 className="fw-bold text-dark">Join FarmFlow</h2>
          <p className="text-muted">Register as a supplier or buyer to trade fresh produce</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 rounded-3 text-center py-2" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Role selector buttons */}
          <div className="row g-2 mb-4">
            <div className="col">
              <button
                type="button"
                className={`btn w-100 py-2.5 rounded-3 fw-bold transition-all ${role === 'buyer' ? 'btn-primary-farm' : 'btn-light border text-muted'}`}
                onClick={() => setRole('buyer')}
              >
                I am a Buyer
              </button>
            </div>
            <div className="col">
              <button
                type="button"
                className={`btn w-100 py-2.5 rounded-3 fw-bold transition-all ${role === 'supplier' ? 'btn-primary-farm' : 'btn-light border text-muted'}`}
                onClick={() => setRole('supplier')}
              >
                I am a Supplier
              </button>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label className="form-label text-dark fw-semibold">First Name</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 text-success">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  className={`form-control border-start-0 ps-0 ${getFieldError('firstName') ? 'is-invalid' : ''}`}
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  required
                />
              </div>
              {getFieldError('firstName') && <div className="text-danger small mt-1">{getFieldError('firstName')}</div>}
            </div>
            <div className="col-sm-6">
              <label className="form-label text-dark fw-semibold">Last Name</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 text-success">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  className={`form-control border-start-0 ps-0 ${getFieldError('lastName') ? 'is-invalid' : ''}`}
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  required
                />
              </div>
              {getFieldError('lastName') && <div className="text-danger small mt-1">{getFieldError('lastName')}</div>}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label text-dark fw-semibold">Email Address</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 text-success">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className={`form-control border-start-0 ps-0 ${getFieldError('email') ? 'is-invalid' : ''}`}
                placeholder="john@example.com"
                value={email}
                onChange={(e) => handleFieldChange('email', e.target.value, validateEmail, 'Please enter a valid email address')}
                required
              />
            </div>
            {getFieldError('email') && <div className="text-danger small mt-1">{getFieldError('email')}</div>}
          </div>

          <div className="mb-3">
            <label className="form-label text-dark fw-semibold">Phone Number</label>
            <div className="input-group">
              <span className="input-group-text bg-transparent border-end-0 text-success">
                <Phone size={18} />
              </span>
              <input
                type="tel"
                className={`form-control border-start-0 ps-0 ${getFieldError('phone') ? 'is-invalid' : ''}`}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => handleFieldChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10), validatePhone, 'Please provide a valid 10-digit Indian phone number starting with 6-9')}
                required
              />
            </div>
            {getFieldError('phone') && <div className="text-danger small mt-1">{getFieldError('phone')}</div>}
          </div>

          {/* Business Info Section */}
          <div className="card border-0 bg-success-subtle p-3 rounded-4 mb-4">
            <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
              <Store size={18} /> Business Information
            </h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label text-dark fw-semibold">Business Name</label>
                <input
                  type="text"
                  className={`form-control ${getFieldError('businessName') ? 'is-invalid' : ''}`}
                  placeholder="e.g. Green Farms Ltd"
                  value={businessName}
                  onChange={(e) => handleFieldChange('businessName', e.target.value)}
                  required
                />
                {getFieldError('businessName') && <div className="text-danger small mt-1">{getFieldError('businessName')}</div>}
              </div>
              {role === 'buyer' ? (
                <div className="col-md-6">
                  <label className="form-label text-dark fw-semibold">Business Type</label>
                  <select
                    className="form-select"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                  >
                    <option value="hotel">Hotel</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="caterer">Caterer</option>
                    <option value="other">Other Bulk Buyer</option>
                  </select>
                </div>
              ) : (
                <div className="col-md-6">
                  <label className="form-label text-dark fw-semibold">GST Number (Optional)</label>
                  <input
                    type="text"
                    className={`form-control ${getFieldError('gstNumber') ? 'is-invalid' : ''}`}
                    placeholder="22AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => handleFieldChange('gstNumber', e.target.value)}
                  />
                  {getFieldError('gstNumber') && <div className="text-danger small mt-1">{getFieldError('gstNumber')}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-sm-6">
              <label className="form-label text-dark fw-semibold">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 text-success">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  className={`form-control border-start-0 ps-0 ${getFieldError('password') ? 'is-invalid' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handleFieldChange('password', e.target.value, validatePassword, 'Must contain 8+ characters, with uppercase, lowercase, number and special character')}
                  required
                />
              </div>
              {getFieldError('password') && <div className="text-danger small mt-1">{getFieldError('password')}</div>}
            </div>
            <div className="col-sm-6">
              <label className="form-label text-dark fw-semibold">Confirm Password</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 text-success">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  className={`form-control border-start-0 ps-0 ${getFieldError('confirmPassword') ? 'is-invalid' : ''}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  required
                />
              </div>
              {getFieldError('confirmPassword') && <div className="text-danger small mt-1">{getFieldError('confirmPassword')}</div>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary-farm w-100 py-2.5 mb-3 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="text-center text-muted" style={{ fontSize: '14px' }}>
          Already have an account?{' '}
          <Link to="/login" className="text-success text-decoration-none fw-bold">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
