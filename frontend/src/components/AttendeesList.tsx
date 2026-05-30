import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../App.css';

interface Attendance {
  id: string;
  eventId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  checkedInAt: Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Event {
  id: string;
  title: string;
  organizationId: string;
}

interface AttendeesListProps {
  eventId?: string;
  onClose?: () => void;
}

function AttendeesList({ eventId: propEventId, onClose }: AttendeesListProps = {}) {
  const params = useParams<{ eventId: string }>();
  const eventId = propEventId ?? params.eventId;
  const navigate = useNavigate();
  const { user, isAdmin, isOrg } = useAuth();
  const handleClose = onClose ?? (() => navigate('/events'));
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId, user]);

  const loadData = async () => {
    if (!eventId || !user) return;
    
    try {
      setLoading(true);
      
      // Load event details
      const eventRes = await api.get(`/events/${eventId}`);
      setEvent(eventRes.data);
      
      // Check if user has access to view attendees
      // 1. Admin can see all
      // 2. Org admin can see their org events
      // 3. Regular users can only see if they are registered
      let canView = false;
      
      if (isAdmin) {
        canView = true;
      } else if (isOrg && user.organizationId === eventRes.data.organizationId) {
        canView = true;
      } else {
        // Check if user is registered for this event
        const myAttendancesRes = await api.get('/attendances');
        const myAttendances = myAttendancesRes.data.filter(
          (att: Attendance) => att.userId === user.id && att.eventId === eventId
        );
        canView = myAttendances.length > 0;
      }
      
      setHasAccess(canView);
      
      if (canView) {
        // Load attendances
        const attendancesRes = await api.get(`/attendances?eventId=${eventId}`);
        setAttendances(attendancesRes.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load attendees:', error);
      toast.error(error.response?.data?.message || 'Failed to load attendees');
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async (attendanceId: string) => {
    try {
      await api.post(`/attendances/${attendanceId}/checkin`);
      toast.success('Checked in successfully!');
      loadData();
    } catch (error: any) {
      console.error('Failed to check in:', error);
      toast.error(error.response?.data?.message || 'Failed to check in');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="card">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <h3>Access Denied</h3>
          <p>You must be registered for this event to view the attendee list.</p>
          <button onClick={handleClose} className="btn btn-primary">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h1 className="card-title">Attendees</h1>
          {event && <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>{event.title}</p>}
        </div>
        <div className="card-actions">
          <button onClick={handleClose} className="btn btn-secondary">
            Back to Events
          </button>
        </div>
      </div>

      {attendances.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
          </svg>
          <h3>No attendees yet</h3>
          <p>No one has registered for this event yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                {(isAdmin || isOrg) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {attendances.map((attendance) => (
                <tr key={attendance.id}>
                  <td style={{ fontWeight: 600 }}>
                    {attendance.user?.name || attendance.userName || 'N/A'}
                  </td>
                  <td>{attendance.user?.email || attendance.userEmail || 'N/A'}</td>
                  <td>
                    {attendance.checkedInAt ? (
                      <span className="badge badge-success">Checked In</span>
                    ) : (
                      <span className="badge badge-warning">Registered</span>
                    )}
                  </td>
                  {(isAdmin || isOrg) && (
                    <td>
                      {!attendance.checkedInAt && (
                        <button
                          onClick={() => checkIn(attendance.id)}
                          className="btn btn-sm btn-primary"
                        >
                          Check In
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AttendeesList;
