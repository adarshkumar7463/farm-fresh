import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/api.js';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { 
  ShoppingBag, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Activity, 
  Sparkles 
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SupplierDashboard = () => {
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['supplierDashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/supplier');
      return response.data.data;
    },
  });

  const cards = dashboardData?.stats?.cards || {};
  const topProducts = dashboardData?.stats?.topProducts || [];
  const monthlySales = dashboardData?.stats?.monthlySales || [];
  const predictions = dashboardData?.aiPredictions || [];
  const suggestions = dashboardData?.aiSuggestions || [];

  // Chart data configuration
  const lineChartData = {
    labels: monthlySales.map((item) => item.label),
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: monthlySales.map((item) => item.revenue),
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: topProducts.map((item) => item.name),
    datasets: [
      {
        label: 'Quantity Sold',
        data: topProducts.map((item) => item.totalQuantity),
        backgroundColor: '#4caf50',
      },
    ],
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        
        <div className="container-fluid p-0 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Supplier Dashboard</h2>
            <button className="btn btn-outline-success btn-sm" onClick={() => refetch()}>
              Refresh Stats
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-success-subtle text-success p-3 rounded-circle">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Total Products</div>
                      <h4 className="fw-bold mb-0">{cards.totalProducts}</h4>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-primary-subtle text-primary p-3 rounded-circle">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Total Sales</div>
                      <h4 className="fw-bold mb-0">₹{cards.totalRevenue}</h4>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-info-subtle text-info p-3 rounded-circle">
                      <Users size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Active Customers</div>
                      <h4 className="fw-bold mb-0">{cards.totalCustomers}</h4>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-danger-subtle text-danger p-3 rounded-circle">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Low Stock Alert</div>
                      <h4 className="fw-bold mb-0 text-danger">{cards.lowStockProducts}</h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Assistant Section */}
              <div className="card border-0 bg-success-subtle p-3 rounded-4 mb-4">
                <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <Sparkles size={20} /> AI Smart Suggestions & Low Stock Warnings
                </h5>
                <div className="row g-3">
                  {suggestions.length === 0 ? (
                    <div className="col-12 text-muted">All stock levels look great! No suggestions.</div>
                  ) : (
                    suggestions.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="col-md-4">
                        <div className={`p-2.5 rounded-3 bg-white border-start border-4 ${item.type === 'CRITICAL' ? 'border-danger' : 'border-warning'}`} style={{ fontSize: '13px' }}>
                          <span className="fw-bold text-dark">{item.type}:</span> {item.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Charts Section */}
              <div className="row g-4 mb-4">
                <div className="col-lg-7">
                  <div className="card-farm p-3">
                    <h5 className="fw-bold text-success mb-3">Revenue Trend</h5>
                    <Line data={lineChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="card-farm p-3">
                    <h5 className="fw-bold text-success mb-3">Top Selling Products</h5>
                    <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>
                </div>
              </div>

              {/* AI Demand Prediction Table */}
              <div className="card-farm p-3">
                <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <Activity size={20} /> AI-Based Weekly Demand Prediction & Inventory Plan
                </h5>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Current Stock</th>
                        <th>Weekly Sales Avg</th>
                        <th>AI Predicted Next Week</th>
                        <th>Reorder Recommendations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center text-muted">No sales prediction data available yet</td>
                        </tr>
                      ) : (
                        predictions.map((p) => (
                          <tr key={p.productId}>
                            <td className="fw-semibold">{p.name}</td>
                            <td>{p.currentStock} {p.unit}</td>
                            <td>{p.averageWeeklySales} {p.unit}</td>
                            <td className="text-success fw-bold">{p.predictedNextWeekDemand} {p.unit}</td>
                            <td>
                              <span className={`badge ${p.recommendation === 'REORDER_NOW' ? 'bg-danger' : p.recommendation === 'MONITOR' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                {p.recommendation}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
