import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/api.js';
import { FileSpreadsheet, FileText, UserCheck, TrendingUp, HelpCircle } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

const SupplierReports = () => {
  // Fetch Customer Spend Analytics
  const { data: customerData, isLoading: customersLoading } = useQuery({
    queryKey: ['customerSpending'],
    queryFn: async () => {
      const response = await api.get('/analytics/customers');
      return response.data.data.customerSpending;
    },
  });

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Business Intelligence Reports</h2>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
                <FileSpreadsheet size={16} /> Export to Excel
              </button>
            </div>
          </div>

          <div className="row g-4">
            {/* Customer Spending Analysis Table */}
            <div className="col-12">
              <div className="card-farm p-4">
                <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <UserCheck size={20} /> Customer Spending & Loyalty Profiling
                </h5>
                <p className="text-muted small">Analyze bulk purchase habits, average order values, and client segments.</p>
                
                {customersLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status"></div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                      <thead>
                        <tr>
                          <th>Client Name</th>
                          <th>Business Name</th>
                          <th>Total Revenue (₹)</th>
                          <th>Orders Placed</th>
                          <th>Average Value (AOV)</th>
                          <th>Customer Segment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData?.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center text-muted">No client purchase history found</td>
                          </tr>
                        ) : (
                          customerData?.map((item, idx) => (
                            <tr key={idx}>
                              <td className="fw-semibold">{item.name}</td>
                              <td>{item.businessName}</td>
                              <td className="fw-bold text-success">₹{item.totalSpent}</td>
                              <td>{item.orderCount} orders</td>
                              <td>₹{item.averageOrderValue}</td>
                              <td>
                                <span className={`badge ${item.segment === 'VIP' ? 'bg-danger' : item.segment === 'Regular' ? 'bg-primary' : 'bg-secondary'}`}>
                                  {item.segment}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierReports;
