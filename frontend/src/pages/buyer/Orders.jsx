import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api.js';
import { Eye, FileDown, XCircle, RefreshCw } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

const BuyerOrders = () => {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch Buyer Orders
  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['buyerOrders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data.data.orders;
    },
  });

  // Cancel Order Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      return api.post(`/orders/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['buyerOrders']);
      setSelectedOrder(null);
    },
  });

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
      alert('Invoice download failed');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">My Order History</h2>
            <button className="btn btn-outline-success btn-sm d-flex align-items-center gap-1" onClick={() => refetch()}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

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
                      <th>Placed Date</th>
                      <th>Items Count</th>
                      <th>Total Cost</th>
                      <th>Order Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderData?.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted">No orders placed yet</td>
                      </tr>
                    ) : (
                      orderData?.map((order) => (
                        <tr key={order._id}>
                          <td className="fw-semibold text-success">{order.orderNumber}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td>{order.items?.length} items</td>
                          <td className="fw-bold">₹{order.pricing?.total}</td>
                          <td>
                            <span className={`badge badge-${order.status}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-success btn-sm d-flex align-items-center gap-1" onClick={() => setSelectedOrder(order)}>
                                <Eye size={14} /> Details & Track
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

          {/* Details & Tracking Modal */}
          {selectedOrder && createPortal(
            <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 card-farm shadow-lg p-4">
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-bold text-success">
                      Track Order: {selectedOrder.orderNumber}
                    </h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
                  </div>
                  <div className="modal-body pt-3">
                    {/* Delivery status timeline */}
                    <h6 className="fw-bold text-success mb-3">Delivery Progress Timeline</h6>
                    <div className="mb-4">
                      {selectedOrder.deliveryTimeline?.length === 0 ? (
                        <div className="text-muted small">Timeline details will appear here as the order progresses.</div>
                      ) : (
                        selectedOrder.deliveryTimeline.map((t, idx) => (
                          <div key={idx} className="d-flex gap-3 mb-3">
                            <div className="d-flex flex-column align-items-center">
                              <div className="bg-success text-white rounded-circle p-1.5" style={{ width: '12px', height: '12px' }}></div>
                              {idx < selectedOrder.deliveryTimeline.length - 1 && (
                                <div className="bg-success" style={{ width: '2px', flex: 1, minHeight: '20px' }}></div>
                              )}
                            </div>
                            <div>
                              <div className="fw-bold text-capitalize text-dark" style={{ fontSize: '14px' }}>
                                {t.status.replace('_', ' ')}
                              </div>
                              <div className="text-muted small">{t.description}</div>
                              <div className="text-muted small" style={{ fontSize: '11px' }}>
                                {new Date(t.date).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <h6 className="fw-bold text-success mb-3">Items Summary</h6>
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered table-sm align-middle" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Produce Name</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Amount</th>
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

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                          <button className="btn btn-outline-danger d-flex align-items-center gap-1" onClick={() => cancelMutation.mutate({ id: selectedOrder._id, reason: 'Buyer requested cancellation' })}>
                            <XCircle size={16} /> Cancel Order
                          </button>
                        )}
                      </div>
                      <button className="btn btn-light" onClick={() => setSelectedOrder(null)}>
                        Close
                      </button>
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

export default BuyerOrders;
