import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../App.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart,
} from 'recharts';

// Color schemes for charts
const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#a78bfa',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#22d3ee',
};

const VIOLATION_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6'];

// Helper function to truncate text intelligently
const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

function ReportsDashboard() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('double-booked');
  const [loading, setLoading] = useState(false);
  const [doubleBookedUsers, setDoubleBookedUsers] = useState<any[]>([]);
  const [violatedConstraints, setViolatedConstraints] = useState<any[]>([]);
  const [resourceUtilization, setResourceUtilization] = useState<any[]>([]);
  const [parentChildViolations, setParentChildViolations] = useState<any[]>([]);
  const [externalAttendees, setExternalAttendees] = useState<any[]>([]);
  const [showUpRate, setShowUpRate] = useState<any[]>([]);
  const [threshold, setThreshold] = useState(10);

  useEffect(() => {
    if (activeTab === 'double-booked') {
      loadDoubleBookedUsers();
    } else if (activeTab === 'violated-constraints') {
      loadViolatedConstraints();
    } else if (activeTab === 'resource-utilization') {
      loadResourceUtilization();
    } else if (activeTab === 'parent-child-violations') {
      loadParentChildViolations();
    } else if (activeTab === 'external-attendees') {
      loadExternalAttendees();
    } else if (activeTab === 'show-up-rate') {
      loadShowUpRate();
    }
  }, [activeTab, user, threshold]);

  const loadDoubleBookedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/double-booked-users');
      setDoubleBookedUsers(response.data);
    } catch (error: any) {
      console.error('Failed to load double-booked users:', error);
      toast.error(error.response?.data?.message || 'Failed to load double-booked users');
    } finally {
      setLoading(false);
    }
  };

  const loadViolatedConstraints = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/violated-constraints');
      setViolatedConstraints(response.data);
    } catch (error: any) {
      console.error('Failed to load violated constraints:', error);
      toast.error(error.response?.data?.message || 'Failed to load violated constraints');
    } finally {
      setLoading(false);
    }
  };

  const loadResourceUtilization = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (!isAdmin && user?.organizationId) {
        params.organizationId = user.organizationId;
      }
      const response = await api.get('/reports/resource-utilization', { params });
      setResourceUtilization(response.data || []);
    } catch (error: any) {
      console.error('Failed to load resource utilization:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load resource utilization';
      toast.error(errorMessage);
      setResourceUtilization([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadParentChildViolations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/parent-child-violations');
      setParentChildViolations(response.data);
    } catch (error: any) {
      console.error('Failed to load parent-child violations:', error);
      toast.error(error.response?.data?.message || 'Failed to load parent-child violations');
    } finally {
      setLoading(false);
    }
  };

  const loadExternalAttendees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/external-attendees', {
        params: { threshold },
      });
      setExternalAttendees(response.data);
    } catch (error: any) {
      console.error('Failed to load external attendees:', error);
      toast.error(error.response?.data?.message || 'Failed to load external attendees');
    } finally {
      setLoading(false);
    }
  };


  const loadShowUpRate = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (!isAdmin && user?.organizationId) {
        params.organizationId = user.organizationId;
      }
      const response = await api.get('/reports/show-up-rate', { params });
      setShowUpRate(response.data);
    } catch (error: any) {
      console.error('Failed to load show-up rate:', error);
      toast.error(error.response?.data?.message || 'Failed to load show-up rate');
    } finally {
      setLoading(false);
    }
  };


  const prepareShowUpRateChartData = () => {
    return showUpRate
      .slice()
      .sort((a, b) => parseFloat(b.show_up_rate || b.show_up_rate_percentage || 0) - parseFloat(a.show_up_rate || a.show_up_rate_percentage || 0))
      .slice(0, 15)
      .map((item, index) => ({
        name: `${index + 1}. ${truncateText(item.title || item.event_title || 'Unknown', 25)}`,
        fullName: item.title || item.event_title || 'Unknown',
        showUpRate: parseFloat(item.show_up_rate || item.show_up_rate_percentage || 0),
        registered: item.total_registrations || 0,
        checkedIn: item.checked_in_count || item.total_check_ins || 0,
        notCheckedIn: (item.total_registrations || 0) - (item.checked_in_count || item.total_check_ins || 0),
      }));
  };

  const prepareResourceUtilizationChartData = () => {
    if (!resourceUtilization || !Array.isArray(resourceUtilization) || resourceUtilization.length === 0) {
      return [];
    }
    
    return resourceUtilization
      .filter((item: any) => {
        // Validate item structure
        return item && 
               typeof item === 'object' && 
               item.resource_name && 
               typeof item.resource_name === 'string';
      })
      .slice()
      .sort((a: any, b: any) => {
        // Sort by utilization percentage (primary) and then by hours used (secondary)
        const utilA = parseFloat(String(a.utilization_percentage || 0));
        const utilB = parseFloat(String(b.utilization_percentage || 0));
        if (utilA !== utilB) {
          return utilB - utilA;
        }
        const hoursA = parseFloat(String(a.total_hours_used || 0));
        const hoursB = parseFloat(String(b.total_hours_used || 0));
        return hoursB - hoursA;
      })
      .slice(0, 15)
      .map((item: any, index: number) => {
        const hoursUsed = parseFloat(String(item.total_hours_used || 0));
        const peakConcurrent = parseFloat(String(item.peak_concurrent_usage || 0));
        const maxCapacity = parseFloat(String(item.max_capacity || 0));
        const utilizationPercentage = parseFloat(String(item.utilization_percentage || 0));
        
        return {
          name: `${index + 1}. ${truncateText(item.resource_name || 'Unknown', 20)}`,
          fullName: item.resource_name || 'Unknown',
          hoursUsed: isNaN(hoursUsed) ? 0 : hoursUsed,
          peakConcurrent: isNaN(peakConcurrent) ? 0 : peakConcurrent,
          maxCapacity: isNaN(maxCapacity) ? 0 : maxCapacity,
          utilizationPercentage: isNaN(utilizationPercentage) ? 0 : utilizationPercentage,
          organizationName: item.organization_name || 'Unknown',
        };
      });
  };

  const prepareViolationChartData = () => {
    const violationCounts = violatedConstraints.reduce((acc: any, item: any) => {
      const type = item.violation_type?.replace(/_/g, ' ') || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(violationCounts).map(([name, value]) => ({
      name: truncateText(name, 30),
      fullName: name,
      value,
    }));
  };

  const prepareViolationByResourceData = () => {
    const resourceCounts = violatedConstraints.reduce((acc: any, item: any) => {
      const resource = item.resource_name || 'Unknown';
      acc[resource] = (acc[resource] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(resourceCounts)
      .map(([name, value], index) => ({
        name: `${index + 1}. ${truncateText(name, 18)}`,
        fullName: name,
        count: value as number,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const prepareExternalAttendeesChartData = () => {
    return externalAttendees
      .slice()
      .sort((a, b) => (b.external_attendee_count || 0) - (a.external_attendee_count || 0))
      .slice(0, 15)
      .map((item, index) => ({
        name: `${index + 1}. ${truncateText(item.title || 'Unknown', 25)}`,
        fullName: item.title || 'Unknown',
        externalCount: item.external_attendee_count || 0,
        capacity: item.capacity || 0,
      }));
  };

  // Group double-booked users by user
  const groupDoubleBookedByUser = () => {
    const grouped: Record<string, Array<{ event1_title: string; event1_start: string; event1_end: string; event2_title: string; event2_start: string; event2_end: string }>> = {};
    
    doubleBookedUsers.forEach((item) => {
      const key = `${item.user_id}_${item.email}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({
        event1_title: item.event1_title,
        event1_start: item.event1_start,
        event1_end: item.event1_end,
        event2_title: item.event2_title,
        event2_start: item.event2_start,
        event2_end: item.event2_end,
      });
    });

    return Object.entries(grouped).map(([key, conflicts]) => {
      const [userId, email] = key.split('_');
      const firstItem = doubleBookedUsers.find(item => item.user_id === userId && item.email === email);
      return {
        user_id: userId,
        name: firstItem?.name || 'Unknown',
        email: email,
        conflicts,
      };
    });
  };

  const tabs = [
    { id: 'double-booked', label: 'Double-Booked Users', icon: '⚠️' },
    { id: 'violated-constraints', label: 'Resource Violations', icon: '🚫' },
    { id: 'resource-utilization', label: 'Resource Utilization', icon: '📊' },
    { id: 'parent-child-violations', label: 'Event Hierarchy', icon: '🔗' },
    { id: 'external-attendees', label: 'External Attendees', icon: '👥' },
    { id: 'show-up-rate', label: 'Engagement & Conversion Analytics', icon: '✅' },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const fullName = data?.fullName || label;
      return (
        <div style={{
          backgroundColor: 'var(--gray-100)',
          padding: '0.75rem',
          border: '1px solid var(--gray-300)',
          borderRadius: '0.5rem',
          boxShadow: 'none',
          maxWidth: '300px',
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem', wordBreak: 'break-word' }}>
            {fullName}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '0.25rem 0', fontSize: '0.8125rem' }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              {entry.dataKey === 'utilization' || entry.dataKey === 'showUpRate' ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">Reports & Analytics</h1>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap',
        paddingBottom: '1rem',
        borderBottom: '2px solid var(--gray-200)'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.875rem' }}
          >
            <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      )}

      {/* Double-Booked Users Report */}
      {activeTab === 'double-booked' && !loading && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            ⚠️ Double-Booked Users
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Users who are registered for overlapping events at the same time.
          </p>
          {doubleBookedUsers.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3>No Issues Found</h3>
              <p>No users are double-booked for overlapping events.</p>
            </div>
          ) : (
            <div className="table-container">
              {groupDoubleBookedByUser().map((userGroup, groupIdx) => (
                <div key={groupIdx} style={{ marginBottom: '2rem' }}>
                  <div style={{
                    background: 'var(--gray-200)',
                    padding: '1rem 1.25rem',
                    borderBottom: '2px solid var(--gray-300)',
                    marginBottom: '0.5rem',
                  }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                      {userGroup.name}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      {userGroup.email}
                    </p>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Event A</th>
                        <th>Event A Time</th>
                        <th>Event B</th>
                        <th>Event B Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userGroup.conflicts.map((conflict, conflictIdx) => (
                        <tr key={conflictIdx}>
                          <td style={{ fontWeight: 600 }}>{conflict.event1_title}</td>
                          <td>
                            {new Date(conflict.event1_start).toLocaleString()} - {new Date(conflict.event1_end).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 600 }}>{conflict.event2_title}</td>
                          <td>
                            {new Date(conflict.event2_start).toLocaleString()} - {new Date(conflict.event2_end).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Violated Constraints Report */}
      {activeTab === 'violated-constraints' && !loading && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            🚫 Resource Constraint Violations
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Events that violate resource allocation rules (exclusive double-booking, shareable over-allocation, or consumable excess).
          </p>
          {violatedConstraints.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3>No Violations Found</h3>
              <p>All resource allocations are within constraints.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {prepareViolationChartData().length > 0 && (
                  <div style={{ backgroundColor: 'var(--gray-100)', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: 'none' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                      Violations by Type
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={prepareViolationChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${truncateText(name, 15)}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {prepareViolationChartData().map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={VIOLATION_COLORS[index % VIOLATION_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {prepareViolationByResourceData().length > 0 && (
                  <div style={{ backgroundColor: 'var(--gray-100)', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: 'none' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                      Top Violated Resources
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={prepareViolationByResourceData()} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
                        <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" width={90} stroke="#6b7280" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill={CHART_COLORS.danger} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Resource</th>
                      <th>Violation Type</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violatedConstraints.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.event_title}</td>
                        <td>{item.resource_name}</td>
                        <td>
                          <span className="badge badge-danger">{item.violation_type.replace(/_/g, ' ')}</span>
                        </td>
                        <td>{new Date(item.start_time).toLocaleString()}</td>
                        <td>{new Date(item.end_time).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Resource Utilization Report */}
      {activeTab === 'resource-utilization' && !loading && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            📊 Resource Utilization Analysis
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Total hours used, peak concurrent usage, and underutilized resources per organization.
          </p>
          {resourceUtilization.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <h3>No Data Available</h3>
              <p>No resource utilization data found.</p>
            </div>
          ) : (
            <>
              {prepareResourceUtilizationChartData().length > 0 && (
                <div style={{ marginBottom: '2rem', backgroundColor: 'var(--gray-100)', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: 'none' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                    Resource Utilization Overview
                  </h3>
                  <ResponsiveContainer width="100%" height={450}>
                    <ComposedChart data={prepareResourceUtilizationChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={130}
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} label={{ value: 'Hours Used', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 12 }} label={{ value: 'Peak Concurrent', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar yAxisId="left" dataKey="hoursUsed" fill={CHART_COLORS.primary} name="Total Hours Used" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="peakConcurrent" stroke={CHART_COLORS.warning} strokeWidth={2} name="Peak Concurrent" dot={{ fill: CHART_COLORS.warning, r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Resource</th>
                      <th>Type</th>
                      <th>Total Hours Used</th>
                      <th>Peak Concurrent</th>
                      <th>Max Capacity</th>
                      <th>Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourceUtilization.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.organization_name}</td>
                        <td>{item.resource_name}</td>
                        <td>
                          <span className={`badge badge-${
                            item.resource_type === 'exclusive' ? 'warning' :
                            item.resource_type === 'shareable' ? 'info' :
                            'success'
                          }`}>
                            {item.resource_type}
                          </span>
                        </td>
                        <td>{parseFloat(String(item.total_hours_used || 0)).toFixed(2)} hrs</td>
                        <td>{parseFloat(String(item.peak_concurrent_usage || 0))}</td>
                        <td>{parseFloat(String(item.max_capacity || 0))}</td>
                        <td>
                          {item.is_underutilized ? (
                            <span className="badge badge-warning">Underutilized</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Parent-Child Violations Report */}
      {activeTab === 'parent-child-violations' && !loading && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            🔗 Event Hierarchy Violations
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Child events that start before or end after their parent event's time boundaries.
          </p>
          {parentChildViolations.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3>No Violations Found</h3>
              <p>All child events are properly contained within their parent events.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Parent Event</th>
                    <th>Parent Time</th>
                    <th>Child Event</th>
                    <th>Child Time</th>
                    <th>Violation</th>
                  </tr>
                </thead>
                <tbody>
                  {parentChildViolations.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.parent_title}</td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {new Date(item.parent_start).toLocaleString()} <br />
                        <span style={{ color: 'var(--gray-500)' }}>to</span> <br />
                        {new Date(item.parent_end).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.child_title}</td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {new Date(item.child_start).toLocaleString()} <br />
                        <span style={{ color: 'var(--gray-500)' }}>to</span> <br />
                        {new Date(item.child_end).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-danger">
                          {item.violation_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* External Attendees Report */}
      {activeTab === 'external-attendees' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--gray-900)' }}>
                👥 Events with External Attendees
              </h2>
              <p style={{ color: 'var(--gray-600)', margin: 0 }}>
                Events where external (non-user) attendees exceed a specified threshold.
              </p>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Minimum Threshold
              </label>
              <input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
                placeholder="e.g., 10"
              />
            </div>
          </div>
          {externalAttendees.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <h3>No Events Found</h3>
              <p>No events with external attendees exceeding the threshold of {threshold}.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2rem', backgroundColor: 'var(--gray-100)', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: 'none' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                  External Attendees by Event
                </h3>
                <ResponsiveContainer width="100%" height={450}>
                  <ComposedChart data={prepareExternalAttendeesChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={130}
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="externalCount" fill={CHART_COLORS.warning} name="External Attendees" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="capacity" stroke={CHART_COLORS.info} strokeWidth={2} name="Event Capacity" strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Organization</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Capacity</th>
                      <th>External Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {externalAttendees.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.title}</td>
                        <td>{item.organization_name}</td>
                        <td>{new Date(item.start_time).toLocaleString()}</td>
                        <td>{new Date(item.end_time).toLocaleString()}</td>
                        <td>{item.capacity}</td>
                        <td>
                          <span className="badge badge-warning" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>
                            {item.external_attendee_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Show-Up Rate Report */}
      {activeTab === 'show-up-rate' && !loading && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            ✅ Engagement & Conversion Analytics - Show-Up Rate
          </h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            Compare checked-in attendees vs. total registrations. Helps predict actual headcount versus registration numbers.
          </p>
          {showUpRate.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3>No Data Available</h3>
              <p>No show-up rate data found. Events need registered attendees to calculate show-up rates.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2rem', backgroundColor: 'var(--gray-100)', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: 'none' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
                  Show-Up Rate Analysis (Top 15 Events)
                </h3>
                <ResponsiveContainer width="100%" height={550}>
                  <ComposedChart data={prepareShowUpRateChartData()} margin={{ top: 20, right: 50, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e26" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={130}
                      stroke="#6b7280"
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 12 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 12 }} domain={[0, 100]} label={{ value: 'Show-Up Rate %', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar yAxisId="left" dataKey="registered" fill={CHART_COLORS.info} name="Total Registered" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="checkedIn" fill={CHART_COLORS.success} name="Checked In" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="showUpRate" stroke={CHART_COLORS.primary} strokeWidth={3} name="Show-Up Rate %" dot={{ fill: CHART_COLORS.primary, r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Organization</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Total Registrations</th>
                      <th>Checked In</th>
                      <th>Show-Up Rate %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showUpRate.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.title || item.event_title}</td>
                        <td>{item.organization_name}</td>
                        <td>{new Date(item.start_time || item.startTime).toLocaleString()}</td>
                        <td>{new Date(item.end_time || item.endTime).toLocaleString()}</td>
                        <td>{item.total_registrations || 0}</td>
                        <td>{item.checked_in_count || item.total_check_ins || 0}</td>
                        <td>
                          <span
                            className={`badge ${
                              parseFloat(item.show_up_rate || item.show_up_rate_percentage || 0) >= 80
                                ? 'badge-success'
                                : parseFloat(item.show_up_rate || item.show_up_rate_percentage || 0) >= 50
                                ? 'badge-info'
                                : 'badge-warning'
                            }`}
                            style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
                          >
                            {parseFloat(item.show_up_rate || item.show_up_rate_percentage || 0).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ReportsDashboard;
