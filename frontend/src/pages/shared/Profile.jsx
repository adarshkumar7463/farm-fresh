import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateUserProfile } from '../../store/slices/authSlice.js';
import api from '../../api/api.js';
import { User, Store, MapPin, Plus, Trash2, Save } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Profile forms
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessName, setBusinessName] = useState(user?.businessInfo?.businessName || '');
  const [loading, setLoading] = useState(false);

  // Address forms
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/users/profile', {
        firstName,
        lastName,
        phone,
        businessInfo: {
          businessName,
        },
      });
      if (response.data.success) {
        dispatch(updateUserProfile(response.data.data.user));
        alert('Profile updated successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/users/addresses', {
        street,
        city,
        state,
        postalCode,
        label: 'Work',
      });
      if (response.data.success) {
        dispatch(updateUserProfile(response.data.data.user));
        alert('Address added successfully!');
        setStreet('');
        setCity('');
        setState('');
        setPostalCode('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add address');
    }
  };

  const handleRemoveAddress = async (addressId) => {
    try {
      const response = await api.delete(`/users/addresses/${addressId}`);
      if (response.data.success) {
        dispatch(updateUserProfile(response.data.data.user));
        alert('Address removed successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove address');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          <h2 className="fw-bold mb-4">My Account Settings</h2>

          <div className="row g-4">
            {/* Profile Modification Form */}
            <div className="col-lg-6">
              <form onSubmit={handleUpdateProfile} className="card-farm p-4 mb-4">
                <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <User size={20} /> Personal Profile Details
                </h5>
                <div className="row g-3 mb-3">
                  <div className="col-sm-6">
                    <label className="form-label fw-semibold text-dark">First Name</label>
                    <input type="text" className="form-control" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label fw-semibold text-dark">Last Name</label>
                    <input type="text" className="form-control" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark">Phone Number</label>
                  <input type="tel" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold text-dark">Business Name</label>
                  <input type="text" className="form-control" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary-farm d-flex align-items-center gap-2" disabled={loading}>
                  <Save size={16} /> Save Profiles
                </button>
              </form>
            </div>

            {/* Address Modification List & Form */}
            <div className="col-lg-6">
              <div className="card-farm p-4 mb-4">
                <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <MapPin size={20} /> Delivery & Dispatch Addresses
                </h5>
                <div className="mb-4">
                  {user?.addresses?.length === 0 ? (
                    <div className="text-muted small">No addresses added yet.</div>
                  ) : (
                    user?.addresses?.map((addr) => (
                      <div key={addr._id} className="d-flex justify-content-between align-items-center p-2 border rounded-3 mb-2 bg-light">
                        <div style={{ fontSize: '13px' }} className="text-dark">
                          <strong>{addr.label}:</strong> {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
                        </div>
                        <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleRemoveAddress(addr._id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddAddress}>
                  <h6 className="fw-bold text-success mb-2">Add New Location</h6>
                  <div className="mb-2">
                    <input type="text" className="form-control form-control-sm" placeholder="Street Address" value={street} onChange={(e) => setStreet(e.target.value)} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col">
                      <input type="text" className="form-control form-control-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <div className="col">
                      <input type="text" className="form-control form-control-sm" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} required />
                    </div>
                    <div className="col">
                      <input type="text" className="form-control form-control-sm" placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary-farm btn-sm d-flex align-items-center gap-1">
                    <Plus size={16} /> Add Address
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
