import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { isPastEvent } from '../utils/eventUtils';
import { getCurrentEasternTime } from '../utils/timeUtils';
import { formatTableDate } from '../utils/dateFormatter';
import '../App.css';

interface Attendance {
  id: string;
  eventId: string;
  userId: string;
  checkedInAt: Date | null;
  createdAt: Date;
  event?: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    organization?: { name: string };
  };
}

function MyAttendance() {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const res = await api.get('/attendances');
      
      // Filter for current user's attendances
      const myAttendances = (res.data || []).filter(
        (att: Attendance) => att.userId === user.id
      );
      
      setAttendances(myAttendances);
    } catch (error: any) {
      console.error('Failed to load attendance:', error);
      toast.error(error.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // ============================================
  // EVENT CATEGORIZATION LOGIC
  // ============================================
  // 
  // For attendance calculations, we only consider events that have started:
  // - Started Events: event.startTime <= now (includes both current and past events)
  // - Past Events: event.endTime < now (for display purposes)
  //
  // This ensures attendance rate is calculated only on events that have occurred,
  // not on future events where attendance hasn't been determined yet.
  
  // Filter attendances for events that have started (past + ongoing)
  // Only these count for attendance percentage calculations
  // Logic: event has started if startTime <= current Eastern Time
  const now = getCurrentEasternTime();
  const attendancesWithEventData = attendances.filter(att => att.event !== undefined);
  const startedAttendances = attendancesWithEventData.filter((att: Attendance) => {
    if (!att.event) return false;
    const eventStartTime = new Date(att.event.startTime);
    return eventStartTime <= now;
  });

  // Calculate statistics based on past and ongoing events
  // Only events that have started are considered for attendance percentage
  const totalPastAndOngoing = startedAttendances.length;
  const totalAttended = startedAttendances.filter((att: Attendance) => att.checkedInAt).length;
  const totalMissed = totalPastAndOngoing - totalAttended; // Events that started but user didn't check in
  
  // Attendance rate: (attended events / total past and ongoing events) * 100
  // This automatically reduces percentage if user missed events (didn't check in)
  const attendanceRate = totalPastAndOngoing > 0 
    ? Math.round((totalAttended / totalPastAndOngoing) * 100) 
    : 0;
  
  // Total registered includes all events (past + ongoing + upcoming)
  const totalRegistered = attendances.length;

  // Filter past events (events that have ended) for display
  // Using utility function for consistent logic
  const pastAttendances = attendances.filter(att => 
    att.event && isPastEvent(att.event)
  );

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">My Attendance History</h1>
      </div>

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div className="stat-card">
          <div className="stat-value">{totalRegistered}</div>
          <div className="stat-label">Total Registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalAttended}</div>
          <div className="stat-label">Events Attended</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalMissed}</div>
          <div className="stat-label">Events Missed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{attendanceRate}%</div>
          <div className="stat-label">Attendance Rate</div>
          <small style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem', display: 'block' }}>
            Based on {totalPastAndOngoing} started event{totalPastAndOngoing !== 1 ? 's' : ''}
          </small>
        </div>
      </div>

      {/* Circular Progress Chart */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '2rem',
        backgroundColor: 'var(--gray-200)',
        borderRadius: '12px'
      }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--gray-200)"
              strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--primary-color)"
              strokeWidth="10"
              strokeDasharray={`${attendanceRate * 2.51} 251`}
              strokeLinecap="round"
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              {attendanceRate}%
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              Attended
            </div>
          </div>
        </div>
      </div>

      {/* Past Events Table */}
      <h2 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 600, 
        marginBottom: '1rem',
        color: 'var(--gray-900)'
      }}>
        Past Events
      </h2>

      {pastAttendances.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h3>No past events</h3>
          <p>You haven't attended any events yet. Register for upcoming events to build your attendance history!</p>
          <Link to="/events" className="btn btn-primary">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Organization</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastAttendances
                .sort((a, b) => 
                  new Date(b.event?.endTime || 0).getTime() - 
                  new Date(a.event?.endTime || 0).getTime()
                )
                .map((attendance) => (
                  <tr key={attendance.id}>
                    <td style={{ fontWeight: 600 }}>
                      {attendance.event?.title || 'Unknown Event'}
                    </td>
                    <td>{attendance.event?.organization?.name || 'N/A'}</td>
                    <td>
                      {attendance.event?.startTime 
                        ? formatTableDate(attendance.event.startTime)
                        : 'N/A'}
                    </td>
                    <td>
                      {attendance.checkedInAt ? (
                        <span className="badge badge-success">
                          ✓ Attended
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          ✗ Did Not Attend
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MyAttendance;
