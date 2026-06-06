import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { addItemToCart } from '../../store/slices/cartSlice.js';
import api from '../../api/api.js';
import { Search, ShoppingCart, Tag, Filter, Star, Sparkles } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

const BuyerMarketplace = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Fetch Marketplace Dashboard & Recommendations
  const { data: dashboardData } = useQuery({
    queryKey: ['buyerDashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/buyer');
      return response.data.data;
    },
  });

  // Fetch Products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['marketplaceProducts', search, selectedCategory],
    queryFn: async () => {
      const response = await api.get('/products', {
        params: {
          search: search || undefined,
          category: selectedCategory || undefined,
          limit: 30,
        },
      });
      return response.data.data.products;
    },
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return [
        { _id: '64f0b2f384a56c001712aabc', name: 'Vegetables' },
        { _id: '64f0b2f384a56c001712aabd', name: 'Fruits' },
        { _id: '64f0b2f384a56c001712aabe', name: 'Herbs' },
      ];
    },
  });

  const handleAddToCart = (productId) => {
    dispatch(addItemToCart({ productId, quantity: 1 })).then(() => {
      alert('Product added to cart!');
      queryClient.invalidateQueries(['cart']);
    });
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          {/* Header search controls */}
          <div className="d-flex flex-column flex-md-row gap-3 justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Fresh Produce Marketplace</h2>
            <div className="d-flex gap-2 w-100" style={{ maxWidth: '500px' }}>
              <div className="input-group">
                {/* <span className="input-group-text bg-white border-end-0 text-success">
                  <Search size={18} />
                </span> */}
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder=" Search fresh fruits & vegetables..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="form-select w-auto" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Recommendations */}
          {dashboardData?.recommendations?.length > 0 && (
            <div className="card border-0 bg-success-subtle p-3 rounded-4 mb-4">
              <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                <Sparkles size={20} /> Smart Recommendations For You
              </h5>
              <div className="row g-3">
                {dashboardData.recommendations.map((p) => (
                  <div key={p._id} className="col-md-2 col-sm-4 col-6">
                    <div
  className="card-farm"
  style={{
    position: 'relative',
    borderRadius: '18px',
    padding: '14px 12px 12px',
    textAlign: 'center',
    overflow: 'hidden',
    background: 'rgba(30, 180, 110, 0.10)',
    border: '1px solid rgba(60, 200, 120, 0.28)',
    backdropFilter: 'blur(14px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
    boxShadow: '0 2px 16px rgba(30,160,90,0.10), inset 0 1px 0 rgba(255,255,255,0.18)',
    transition: 'transform 0.22s cubic-bezier(.34,1.56,.64,1)',
  }}
>
  <img
    src={p.images?.[0]?.url|| 'https://via.placeholder.com/80?text=Fresh'}
    style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px', border: '1px solid rgba(60,200,120,0.18)' }}
    alt={p.name}
  />
  <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text-primary)', marginBottom: '3px' }}>
    {p.name}
  </div>
  <div style={{ fontSize: '12px', fontWeight: 500, color: '#1ca865', marginBottom: '10px' }}>
    ₹{p.price} / {p.unit}
  </div>
  <button
    style={{ width: '100%', background: 'rgba(28,168,101,0.82)', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '7px 0', borderRadius: '10px', border: 'none', cursor: 'pointer', boxShadow: '0 1px 6px rgba(28,168,101,0.22), inset 0 1px 0 rgba(255,255,255,0.18)' }}
    onClick={() => handleAddToCart(p._id)}
  >
    + Add
  </button>
</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Grid */}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : (
            <div className="row g-3">
              {productsData?.length === 0 ? (
                <div className="col-12 text-center text-muted py-5">No products matching the search query</div>
              ) : (
                productsData?.map((p) => (
                  <div key={p._id} className="col-lg-3 col-md-4 col-sm-6">
                    <div className="card-farm h-100 d-flex flex-column justify-content-between p-3">
                      <div>
                        <div className="position-relative mb-3">
                          <img 
                            src={p.images?.[0]?.url || 'https://via.placeholder.com/150?text=Produce'}
                            alt={p.name}
                            className="rounded-3 w-100"
                            style={{ height: '160px', objectFit: 'cover' }}
                          />
                          {p.discount?.isActive && (
                            <span className="position-absolute top-0 start-0 bg-danger text-white px-2.5 py-1 rounded-3 m-2 fw-bold" style={{ fontSize: '12px' }}>
                              {p.discount.type === 'percentage' ? `${p.discount.value}% OFF` : `₹${p.discount.value} OFF`}
                            </span>
                          )}
                        </div>
                        <div className="fw-bold  fs-5 mb-1">{p.name}</div>
                        <div className="text-muted small mb-2">{p.category?.name || 'Produce'}</div>
                        <p className="text-muted text-truncate mb-3" style={{ fontSize: '13px' }}>{p.description || 'Premium quality produce directly from local farms.'}</p>
                      </div>

                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            {p.discount?.isActive ? (
                              <>
                                <span className="text-success fw-bold fs-5">₹{p.effectivePrice}</span>
                                <span className="text-muted text-decoration-line-through ms-2 small">₹{p.price}</span>
                              </>
                            ) : (
                              <span className="text-success fw-bold fs-5">₹{p.price}</span>
                            )}
                            <span className="text-muted small"> / {p.unit}</span>
                          </div>
                          <span className="text-muted small">Stock: {p.stock?.quantity}</span>
                        </div>
                        <button className="btn btn-primary-farm w-100 d-flex align-items-center justify-content-center gap-2" onClick={() => handleAddToCart(p._id)}>
                          <ShoppingCart size={18} /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerMarketplace;
