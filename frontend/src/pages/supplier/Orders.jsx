import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api.js';
import { Eye, Truck, Check, FileDown, X } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

const SupplierOrders = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [comment, setComment] = useState('');

  // Fetch Supplier Orders
  const { data: orderData, isLoading } = useQuery({
    queryKey: ['supplierOrders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data.data.orders;
    },
  });

  // Update Status Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, comment }) => {
      return api.patch(`/orders/${id}/status`, { status, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['supplierOrders']);
      setSelectedOrder(null);
      setComment('');
    },
  });

  // Download Invoice PDF
  const handleDownloadInvoice = async (id, orderNumber) => {
    try {
      const response = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Failed to download invoice');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          <h2 className="fw-bold mb-4">Incoming Customer Orders</h2>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : (
            <div className="card-farm p-3">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                  <thead>
                    <tr>
                      <th>Order No.</th>
                      <th>Customer Name</th>
                      <th>Items Count</th>
                      <th>Total Pricing</th>
                      <th>Payment Method</th>
                      <th>Order Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderData?.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">No orders received yet</td>
                      </tr>
                    ) : (
                      orderData?.map((order) => (
                        <tr key={order._id}>
                          <td className="fw-semibold text-success">{order.orderNumber}</td>
                          <td>
                            <div className="fw-bold">{order.buyer?.businessInfo?.businessName || 'Bulk Buyer'}</div>
                            <div className="text-muted small">{order.buyer?.firstName} {order.buyer?.lastName}</div>
                          </td>
                          <td>{order.items?.length} items</td>
                          <td className="fw-bold">₹{order.pricing?.total}</td>
                          <td className="text-uppercase">{order.payment?.method}</td>
                          <td>
                            <span className={`badge badge-${order.status}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-success btn-sm d-flex align-items-center gap-1" onClick={() => setSelectedOrder(order)}>
                                <Eye size={14} /> View Details
                              </button>
                              <button className="btn btn-outline-dark btn-sm" onClick={() => handleDownloadInvoice(order._id, order.orderNumber)}>
                                <FileDown size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Order View Modal Overlay */}
          {selectedOrder && createPortal(
            <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 card-farm shadow-lg p-4">
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-bold text-success">
                      Order Details: {selectedOrder.orderNumber}
                    </h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
                  </div>
                  <div className="modal-body pt-3">
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <div className="fw-bold">Billing Address</div>
                        <div className="text-muted">
                          {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.postalCode}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="fw-bold">Payment Info</div>
                        <div className="text-muted">
                          Method: {selectedOrder.payment?.method.toUpperCase()} <br />
                          Status: {selectedOrder.payment?.status.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-bold text-success mb-3">Order Items</h6>
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered table-sm align-middle" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Produce Name</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items?.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.name}</td>
                              <td>{item.quantity} {item.unit}</td>
                              <td>₹{item.price}</td>
                              <td className="fw-bold">₹{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mb-4">
                      <label className="form-label text-dark fw-semibold">Status Update Comments</label>
                      <input type="text" className="form-control" placeholder="Optional comments..." value={comment} onChange={(e) => setComment(e.target.value)} />
                    </div>

                    {/* Order Workflow Action Buttons */}
                    <div className="d-flex flex-wrap gap-2 justify-content-between">
                      <div>
                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                          <button className="btn btn-outline-danger" onClick={() => statusMutation.mutate({ id: selectedOrder._id, status: 'cancelled', comment })}>
                            Cancel Order
                          </button>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        {selectedOrder.status === 'pending' && (
                          <button className="btn btn-primary-farm d-flex align-items-center gap-1" onClick={() => statusMutation.mutate({ id: selectedOrder._id, status: 'confirmed', comment })}>
                            <Check size={16} /> Confirm Order
                          </button>
                        )}
                        {selectedOrder.status === 'confirmed' && (
                          <button className="btn btn-primary-farm d-flex align-items-center gap-1" onClick={() => statusMutation.mutate({ id: selectedOrder._id, status: 'processing', comment })}>
                            <Truck size={16} /> Process Order
                          </button>
                        )}
                        {selectedOrder.status === 'processing' && (
                          <button className="btn btn-primary-farm d-flex align-items-center gap-1" onClick={() => statusMutation.mutate({ id: selectedOrder._id, status: 'packed', comment })}>
                            Package Items
                          </button>
                        )}
                        {selectedOrder.status === 'packed' && (
                          <button className="btn btn-primary-farm d-flex align-items-center gap-1" onClick={() => statusMutation.mutate({ id: selectedOrder._id, status: 'out_for_delivery', comment })}>
                            Dispatch Order
                          </button>
                        )}
                        {selectedOrder.status === 'out_for_delivery' && (
                          <button className="btn btn-primary-farm d-flex align-items-center gap-1" onClick={() => statusMutation.mutate({ id: selectedOrder._id, status: 'delivered', comment })}>
                            Deliver Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierOrders;
