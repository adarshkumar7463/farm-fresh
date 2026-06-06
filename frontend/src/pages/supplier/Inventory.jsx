import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api.js';
import { Plus, Edit2, Trash2, Tag, Archive, IndianRupee, Check, X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

// Helper: current date parts
const getCurrentDate = () => {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.toLocaleString('default', { month: 'long' }),
    year: now.getFullYear(),
    weekday: now.toLocaleString('default', { weekday: 'short' }),
  };
};

// Helper: format a date label like "Wednesday, 3 June 2025"
const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  return {
    weekday: d.toLocaleString('default', { weekday: 'long' }),
    day: d.getDate(),
    month: d.toLocaleString('default', { month: 'long' }),
    year: d.getFullYear(),
  };
};

// Helper: get YYYY-MM-DD key from a date string
const getDateKey = (dateStr) => {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
};

// Helper: group products by their createdAt date
const groupProductsByDate = (products) => {
  if (!products?.length) return [];
  const map = {};
  const order = [];
  products.forEach((p) => {
    const key = p.createdAt ? getDateKey(p.createdAt) : 'unknown';
    if (!map[key]) { map[key] = []; order.push(key); }
    map[key].push(p);
  });
  // Most recent date first
  order.sort((a, b) => (a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a)));
  return order.map((key) => ({ dateKey: key, products: map[key] }));
};

const SupplierInventory = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Bulk Adder States
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [saveProgress, setSaveProgress] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageFiles, setImageFiles] = useState([]);

  const today = getCurrentDate();

  // Seeder handlers
  const handleOpenBulkAdd = () => {
    setBulkProducts([
      {
        id: Date.now() + Math.random(),
        name: '',
        price: '',
        unit: 'kg',
        category: categories[0]?._id || '',
        stock: '',
        description: '',
        images: null,
        imagePreview: ''
      }
    ]);
    setShowBulkAdd(true);
  };

  const handleCloseBulkAdd = () => {
    bulkProducts.forEach(p => {
      if (p.imagePreview) URL.revokeObjectURL(p.imagePreview);
    });
    setShowBulkAdd(false);
    setBulkProducts([]);
  };

  const handleAddBulkRow = () => {
    setBulkProducts(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: '',
        price: '',
        unit: 'kg',
        category: categories[0]?._id || '',
        stock: '',
        description: '',
        images: null,
        imagePreview: ''
      }
    ]);
  };

  const handleRemoveBulkRow = (id) => {
    if (bulkProducts.length === 1) return;
    setBulkProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleBulkRowChange = (id, field, value) => {
    setBulkProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleBulkImageChange = (id, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setBulkProducts(prev => prev.map(p => p.id === id ? { ...p, images: file, imagePreview: previewUrl } : p));
  };

  const handleSaveAll = async () => {
    const invalidRows = bulkProducts.filter(p => !p.name.trim() || !p.price || !p.stock || !p.category);
    if (invalidRows.length > 0) {
      setSaveProgress({
        saving: false,
        total: 0,
        current: 0,
        status: 'error',
        errors: ['Please fill in Name, Category, Price, Unit, and Stock Quantity for all rows before saving.']
      });
      return;
    }

    setSaveProgress({ saving: true, total: bulkProducts.length, current: 0, status: 'saving', errors: [] });

    const errors = [];
    for (let i = 0; i < bulkProducts.length; i++) {
      const product = bulkProducts[i];
      setSaveProgress(prev => ({ ...prev, current: i + 1 }));

      const formData = new FormData();
      formData.append('name', product.name.trim());
      formData.append('price', product.price);
      formData.append('unit', product.unit);
      formData.append('category', product.category);
      formData.append('description', product.description.trim());
      formData.append('stock[quantity]', product.stock);
      formData.append('stock[trackInventory]', 'true');
      if (product.images) formData.append('images', product.images);

      try {
        await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (err) {
        const errorMsg = err.response?.data?.message || `Failed to save "${product.name || 'Row ' + (i + 1)}"`;
        errors.push(errorMsg);
      }
    }

    if (errors.length > 0) {
      setSaveProgress(prev => ({ ...prev, status: 'error', errors }));
    } else {
      setSaveProgress(prev => ({ ...prev, status: 'completed' }));
      queryClient.invalidateQueries(['supplierProducts']);
      setTimeout(() => { setShowBulkAdd(false); setBulkProducts([]); setSaveProgress(null); }, 1500);
    }
  };

  // Fetch Supplier Products
  const { data: productData, isLoading } = useQuery({
    queryKey: ['supplierProducts'],
    queryFn: async () => {
      const response = await api.get('/products/my-products');
      return response.data.data.products;
    },
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data.categories;
    },
  });

  // Add Product Mutation
  const addMutation = useMutation({
    mutationFn: async (formData) => api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries(['supplierProducts']); setShowAddModal(false); resetForm(); },
  });

  // Update Product Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }) => api.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries(['supplierProducts']); setEditingProduct(null); resetForm(); },
  });

  // Delete Product Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries(['supplierProducts']); },
  });

  const resetForm = () => { setName(''); setPrice(''); setStock(''); setUnit('kg'); setCategory(''); setDescription(''); setImageFiles([]); };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price);
    setStock(product.stock?.quantity || 0);
    setUnit(product.unit);
    setCategory(product.category?._id || product.category);
    setDescription(product.description || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('unit', unit);
    formData.append('category', category || categories[0]?._id);
    formData.append('description', description);
    formData.append('stock[quantity]', stock);
    formData.append('stock[trackInventory]', 'true');
    if (imageFiles.length > 0) {
      for (const file of imageFiles) formData.append('images', file);
    }
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Inventory Management</h2>
            <button className="btn btn-primary-farm d-flex align-items-center gap-2" onClick={handleOpenBulkAdd}>
              <Plus size={18} /> Add Product
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : productData?.length === 0 ? (
            <div className="card-farm p-5 text-center text-muted">
              No products found in inventory
            </div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {groupProductsByDate(productData).map(({ dateKey, products: group }) => {
                const label = dateKey !== 'unknown' ? formatDateLabel(dateKey) : null;
                return (
                  <div key={dateKey}>

                    {/* ── Date Header ── */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      {label ? (
                        <>
                          {/* Day block */}
                          <div
                            className="d-flex flex-column align-items-center justify-content-center"
                            style={{
                              width: '52px',
                              height: '52px',
                              background: 'var(--primary-green)',
                              borderRadius: '12px',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                              {label.day}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {label.month.slice(0, 3)}
                            </span>
                          </div>

                          {/* Weekday + full date text */}
                          <div style={{ lineHeight: 1.35 }}>
                            <div
  style={{
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-dark)',
  }}
>
  {label.weekday}
</div>
                            <div style={{ fontSize: '12px', color: '#8a9b8a', fontWeight: 500 }}>
                              {label.day} {label.month} {label.year}
                              <span
                                className="ms-2 px-2 py-0"
                                style={{
                                  background: 'rgba(74,124,89,0.1)',
                                  color: 'var(--primary-green)',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                {group.length} {group.length === 1 ? 'product' : 'products'}
                              </span>
                            </div>
                          </div>

                          {/* Horizontal rule */}
                          <div style={{ flex: 1, height: '1px', background: 'rgba(74,124,89,0.15)' }} />
                        </>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>Date unknown</div>
                      )}
                    </div>

                    {/* ── Products Table for this date group ── */}
                    <div className="card-farm p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                          <thead>
                            <tr>
                              <th>Product Image</th>
                              <th>Product Name</th>
                              <th>Category</th>
                              <th>Unit Price</th>
                              <th>Stock Quantity</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.map((product) => (
                              <tr key={product._id}>
                                <td>
                                  <img
  src={product.images?.[0]?.url || 'https://via.placeholder.com/80?text=No+Image'}
  alt={product.name}
  className="rounded-3"
  width="50"
  height="50"
  style={{ objectFit: 'cover' }}
/>
                                </td>
                                <td className="fw-semibold">{product.name}</td>
                                <td>{product.category?.name || 'Produce'}</td>
                                <td>₹{product.price} / {product.unit}</td>
                                <td>{product.stock?.quantity} {product.unit}</td>
                                <td>
                                  <span className={`badge ${product.stock?.quantity > 10 ? 'bg-success' : 'bg-warning text-dark'}`}>
                                    {(product.stockStatus || 'in_stock').replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <button className="btn btn-outline-success btn-sm" onClick={() => handleEditClick(product)}>
                                      <Edit2 size={14} />
                                    </button>
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => deleteMutation.mutate(product._id)}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add / Edit Modal Overlay */}
        {(showAddModal || editingProduct) && createPortal(
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 card-farm shadow-lg p-4">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-success">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => { setShowAddModal(false); setEditingProduct(null); }}></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body pt-3">
                  <div className="mb-3">
                    <label className="form-label text-dark fw-semibold">Product Name</label>
                    <input type="text" className="form-control" placeholder="e.g. Tomatoes" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label text-dark fw-semibold">Price (₹)</label>
                      <input type="number" className="form-control" placeholder="50" value={price} onChange={(e) => setPrice(e.target.value)} required />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label text-dark fw-semibold">Unit</label>
                      <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                        <option value="kg">Kg</option>
                        <option value="box">Box</option>
                        <option value="crate">Crate</option>
                        <option value="piece">Piece</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label text-dark fw-semibold">Category</label>
                      <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label text-dark fw-semibold">Stock Quantity</label>
                      <input type="number" className="form-control" placeholder="100" value={stock} onChange={(e) => setStock(e.target.value)} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-dark fw-semibold">Description</label>
                    <textarea className="form-control" rows="3" placeholder="Fresh organic quality..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-dark fw-semibold">Product Images</label>
                    <input type="file" className="form-control" multiple accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files))} />
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-light" onClick={() => { setShowAddModal(false); setEditingProduct(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary-farm">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Full-Screen Bulk Product Creation Workspace */}
        {showBulkAdd && createPortal(
          <div className="bulk-add-overlay">

            {/* ─── Header ─── */}
            <div className="bulk-add-header d-flex justify-content-between align-items-center">

              {/* Left: title + subtitle */}
              <div>
                <h4 className="fw-bold mb-1" style={{ color: 'var(--primary-green)' }}>
                  <Plus size={22} className="me-2" style={{ verticalAlign: '-3px' }} />
                  Add New Products
                </h4>
                <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                  Fill in the details for each product below. You can add multiple products at once.
                </p>
              </div>

              {/* Right: date pill + product count + close */}
              <div className="d-flex align-items-center gap-3">

                {/* ✅ Date Display */}
                <div
                  className="d-flex align-items-center gap-2 px-3 py-2"
                  style={{
                    background: 'rgba(74,124,89,0.07)',
                    border: '1px solid rgba(74,124,89,0.18)',
                    borderRadius: '12px',
                  }}
                >
                  {/* Day number — large */}
                  <span
                    style={{
                      fontSize: '26px',
                      fontWeight: 700,
                      color: 'var(--primary-green)',
                      lineHeight: 1,
                    }}
                  >
                    {today.day}
                  </span>

                  {/* Divider */}
                  <div
                    style={{
                      width: '1px',
                      height: '28px',
                      background: 'rgba(74,124,89,0.2)',
                    }}
                  />

                  {/* Month + Year stacked */}
                  <div style={{ lineHeight: 1.3 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--primary-green)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {today.month}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#8a9b8a',
                        fontWeight: 500,
                      }}
                    >
                      {today.year}
                    </div>
                  </div>
                </div>

                {/* Product count badge */}
                <span
                  className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill"
                  style={{ fontSize: '14px' }}
                >
                  {bulkProducts.length} {bulkProducts.length === 1 ? 'Product' : 'Products'}
                </span>

                {/* Close button */}
                <button
                  className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '38px', height: '38px' }}
                  onClick={handleCloseBulkAdd}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* ─── Content ─── */}
            <div className="bulk-add-content">
              <div className="bulk-table-card">
                <div className="table-responsive">
                  <table className="table mb-0 bulk-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th style={{ minWidth: '160px' }}>Produce Name</th>
                        <th style={{ minWidth: '130px' }}>Category</th>
                        <th style={{ minWidth: '100px' }}>Price (₹)</th>
                        <th style={{ minWidth: '100px' }}>Unit</th>
                        <th style={{ minWidth: '100px' }}>Stock Qty</th>
                        <th style={{ minWidth: '180px' }}>Description</th>
                        <th style={{ width: '80px' }}>Image</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkProducts.map((product, idx) => (
                        <tr key={product.id}>
                          <td className="bulk-row-num">{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              className="form-control bulk-input-field"
                              placeholder="e.g. Tomatoes"
                              value={product.name}
                              onChange={(e) => handleBulkRowChange(product.id, 'name', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <select
                              className="form-select bulk-input-field"
                              value={product.category}
                              onChange={(e) => handleBulkRowChange(product.id, 'category', e.target.value)}
                            >
                              {categories.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control bulk-input-field"
                              placeholder="50"
                              min="0"
                              step="0.01"
                              value={product.price}
                              onChange={(e) => handleBulkRowChange(product.id, 'price', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <select
                              className="form-select bulk-input-field"
                              value={product.unit}
                              onChange={(e) => handleBulkRowChange(product.id, 'unit', e.target.value)}
                            >
                              <option value="kg">Kg</option>
                              <option value="gram">Gram</option>
                              <option value="piece">Piece</option>
                              <option value="dozen">Dozen</option>
                              <option value="box">Box</option>
                              <option value="crate">Crate</option>
                              <option value="bundle">Bundle</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control bulk-input-field"
                              placeholder="100"
                              min="0"
                              value={product.stock}
                              onChange={(e) => handleBulkRowChange(product.id, 'stock', e.target.value)}
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control bulk-input-field"
                              placeholder="Fresh organic quality..."
                              value={product.description}
                              onChange={(e) => handleBulkRowChange(product.id, 'description', e.target.value)}
                            />
                          </td>
                          <td>
                            <label className="bulk-image-upload-box" htmlFor={`bulk-img-${product.id}`}>
                              {product.imagePreview ? (
                                <img src={product.imagePreview} alt="Preview" className="bulk-image-preview" />
                              ) : (
                                <Upload size={18} style={{ color: 'var(--text-muted)' }} />
                              )}
                              <input
                                id={`bulk-img-${product.id}`}
                                type="file"
                                accept="image/*"
                                className="d-none"
                                onChange={(e) => handleBulkImageChange(product.id, e.target.files[0])}
                              />
                            </label>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => handleRemoveBulkRow(product.id)}
                              title="Remove row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Button */}
                <div className="p-3 text-center" style={{ borderTop: '1px dashed var(--border-color)' }}>
                  <button
                    className="btn btn-outline-success d-inline-flex align-items-center gap-2"
                    onClick={handleAddBulkRow}
                    style={{ borderRadius: '12px', fontWeight: 600 }}
                  >
                    <Plus size={16} /> Add Another Product
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Sticky Footer ─── */}
            <div className="bulk-add-footer">
              <div className="text-muted" style={{ fontSize: '14px' }}>
                <Archive size={16} className="me-1" style={{ verticalAlign: '-2px' }} />
                {bulkProducts.length} {bulkProducts.length === 1 ? 'product' : 'products'} ready to save
              </div>
              <div className="d-flex gap-3">
                <button className="btn btn-light px-4" style={{ borderRadius: '12px', fontWeight: 600 }} onClick={handleCloseBulkAdd}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary-farm px-4 d-flex align-items-center gap-2"
                  onClick={handleSaveAll}
                  disabled={saveProgress?.saving}
                >
                  <Check size={18} /> Save All Products
                </button>
              </div>
            </div>

            {/* ─── Progress Overlay ─── */}
            {saveProgress && createPortal(
              <div className="progress-overlay-backdrop">
                <div className="progress-card text-center">
                  {saveProgress.status === 'saving' && (
                    <>
                      <Loader2 size={48} className="text-success mb-3" style={{ animation: 'spin 1s linear infinite' }} />
                      <h5 className="fw-bold mb-2">Saving Products...</h5>
                      <p className="text-muted mb-3">
                        Saving product {saveProgress.current} of {saveProgress.total}
                      </p>
                      <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                        <div
                          className="progress-bar bg-success"
                          style={{
                            width: `${(saveProgress.current / saveProgress.total) * 100}%`,
                            transition: 'width 0.3s ease'
                          }}
                        ></div>
                      </div>
                    </>
                  )}
                  {saveProgress.status === 'completed' && (
                    <>
                      <CheckCircle size={48} className="text-success mb-3" />
                      <h5 className="fw-bold text-success mb-2">All Products Saved!</h5>
                      <p className="text-muted">
                        {saveProgress.total} {saveProgress.total === 1 ? 'product has' : 'products have'} been added to your inventory.
                      </p>
                    </>
                  )}
                  {saveProgress.status === 'error' && (
                    <>
                      <AlertCircle size={48} className="text-danger mb-3" />
                      <h5 className="fw-bold text-danger mb-2">Some Products Failed</h5>
                      <div className="text-start mb-3" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {saveProgress.errors.map((err, i) => (
                          <div key={i} className="d-flex align-items-start gap-2 mb-2" style={{ fontSize: '13px' }}>
                            <X size={14} className="text-danger mt-1 flex-shrink-0" />
                            <span className="text-muted">{err}</span>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary-farm" onClick={() => setSaveProgress(null)}>
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default SupplierInventory;
