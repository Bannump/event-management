import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../App.css';

interface PublicInviteData {
  event: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    description: string | null;
  };
  invite: {
    id: string;
    userEmail: string | null;
    userName: string | null;
    status: string;
  };
  attendanceId?: string;
}

function PublicInviteResponse() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<PublicInviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<'idle' | 'accepting' | 'declining' | 'accepted' | 'declined'>('idle');
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadInvite();
    }
  }, [token]);

  const loadInvite = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/invites/public/${token}`);
      setInviteData(response.data);
      
      // If invite is already accepted, set action status and attendance ID
      if (response.data.invite.status === 'accepted') {
        setActionStatus('accepted');
        if (response.data.attendanceId) {
          setAttendanceId(response.data.attendanceId);
        }
      } else if (response.data.invite.status === 'declined') {
        setActionStatus('declined');
      }
    } catch (error: any) {
      console.error('Failed to load invite:', error);
      const errorMessage = error.response?.data?.message || 'Invite not found or has expired';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    try {
      setActionStatus('accepting');
      const response = await api.post(`/invites/public/${token}/accept`);
      setActionStatus('accepted');
      // Get attendance ID from response
      if (response.data?.attendanceId) {
        setAttendanceId(response.data.attendanceId);
      }
      // Reload invite data to get updated status
      await loadInvite();
    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      toast.error(error.response?.data?.message || 'Failed to accept invite');
      setActionStatus('idle');
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    try {
      setActionStatus('declining');
      await api.post(`/invites/public/${token}/decline`);
      setActionStatus('declined');
      toast.success('Invite declined');
    } catch (error: any) {
      console.error('Failed to decline invite:', error);
      toast.error(error.response?.data?.message || 'Failed to decline invite');
      setActionStatus('idle');
    }
  };

  const handleCheckIn = async () => {
    if (!attendanceId) return;
    try {
      await api.post(`/attendances/public/${attendanceId}/checkin`);
      toast.success('Successfully checked in!');
      // Optionally reload to show updated status
      if (token) {
        loadInvite();
      }
    } catch (error: any) {
      console.error('Failed to check in:', error);
      toast.error(error.response?.data?.message || 'Failed to check in');
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="loading">
          <div className="spinner"></div>
        </div>
        <p>Loading invite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--red-700)', marginBottom: '1rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto' }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Invite Not Found</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: '2rem' }}>{error}</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary">
          Go to Login
        </button>
      </div>
    );
  }

  if (!inviteData) {
    return null;
  }

  const { event, invite } = inviteData;
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);
  const now = new Date();
  const checkInStartTime = new Date(eventStart.getTime() - 15 * 60 * 1000); // 15 minutes before
  const canCheckIn = actionStatus === 'accepted' && now >= checkInStartTime && now <= eventEnd;

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--gray-900)' }}>Event Invitation</h1>
        <p style={{ color: 'var(--gray-600)' }}>
          {invite.userName ? `Hello, ${invite.userName}!` : `Hello!`}
        </p>
      </div>

      <div style={{
        background: 'var(--gray-200)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid var(--gray-200)',
      }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--gray-900)' }}>{event.title}</h2>
        
        {event.description && (
          <p style={{ marginBottom: '1rem', color: 'var(--gray-700)', lineHeight: '1.6' }}>
            {event.description}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--gray-600)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>Start Time</div>
              <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                {eventStart.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--gray-600)' }}>
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.25rem' }}>End Time</div>
              <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                {eventEnd.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {actionStatus === 'idle' && invite.status === 'pending' && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={handleAccept}
            className="btn btn-primary"
            style={{ minWidth: '150px', padding: '0.875rem 1.5rem', fontSize: '1rem' }}
          >
            Accept Invitation
          </button>
          <button
            onClick={handleDecline}
            className="btn btn-secondary"
            style={{ minWidth: '150px', padding: '0.875rem 1.5rem', fontSize: '1rem' }}
          >
            Decline
          </button>
        </div>
      )}

      {actionStatus === 'accepting' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading">
            <div className="spinner"></div>
          </div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Accepting invitation...</p>
        </div>
      )}

      {actionStatus === 'declining' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading">
            <div className="spinner"></div>
          </div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Declining invitation...</p>
        </div>
      )}

      {actionStatus === 'accepted' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'var(--green-50)',
            border: '1px solid var(--green-200)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: 'var(--green-700)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 0.5rem' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ fontWeight: 600, margin: 0 }}>Successfully registered for the event!</p>
          </div>

          {canCheckIn && attendanceId && (
            <button
              onClick={handleCheckIn}
              className="btn btn-primary"
              style={{ minWidth: '200px', padding: '0.875rem 1.5rem', fontSize: '1rem' }}
            >
              Check In Now
            </button>
          )}

          {!canCheckIn && attendanceId && (
            <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
              Check-in will be available 15 minutes before the event starts.
            </p>
          )}
        </div>
      )}

      {actionStatus === 'declined' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'var(--gray-200)',
            border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            color: 'var(--gray-700)',
          }}>
            <p style={{ fontWeight: 600, margin: 0 }}>You have declined this invitation.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicInviteResponse;
