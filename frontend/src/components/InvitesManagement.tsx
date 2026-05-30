import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatTableDate, formatEventDateTime } from '../utils/dateFormatter';
import '../App.css';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  organizationId: string | null;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
}

interface Invite {
  id: string;
  eventId: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  event?: Event;
  user?: User;
  invitedByOrganizationId: string;
}

function InvitesManagement() {
  const { user, isAdmin } = useAuth();
  const [allInvites, setAllInvites] = useState<Invite[]>([]); // Store all invites from API
  const [events, setEvents] = useState<Event[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // All users from API
  const [availableUsers, setAvailableUsers] = useState<User[]>([]); // Filtered users for dropdown
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    eventId: '',
    userId: '',
    userEmail: '',
    userName: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [, setSelectedEvent] = useState<Event | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      // For org admins, backend will automatically filter by their organization
      // For admins, don't pass organizationId to see all invites
      const [invitesRes, eventsRes, usersRes] = await Promise.all([
        api.get('/invites'),
        // Super Admin: don't pass organizationId to see all events
        // Org Admin: pass organizationId when filtering, but backend will handle visibility
        api.get('/events', { params: isAdmin ? {} : (user?.organizationId ? { organizationId: user.organizationId } : {}) }),
        api.get('/users'),
      ]);
      const invitesData = invitesRes.data || [];
      const eventsData = eventsRes.data || [];
      const usersData = usersRes.data || [];
      
      // Filter out past events - only show future/upcoming events for inviting
      const now = new Date();
      const futureEvents = eventsData.filter((event: Event) => {
        const endTime = new Date(event.endTime);
        return endTime >= now && event.status === 'published';
      });
      
      setAllInvites(invitesData);
      setEvents(futureEvents);
      setAllUsers(usersData);
      
      // Initial filter: org admins can see their org users + independent users
      const filteredUsers = usersData.filter((u: User) => 
        isAdmin || 
        u.organizationId === user?.organizationId || 
        u.organizationId === null // Independent users
      );
      setAvailableUsers(filteredUsers);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    setSelectedEvent(event || null);
    
    // Update available users based on event type
    if (event) {
      let filteredUsers: User[];
      
      if (event.organizationId === null) {
        // Global event - show ALL users
        filteredUsers = allUsers;
      } else if (isAdmin) {
        // Admin can invite anyone
        filteredUsers = allUsers;
      } else {
        // Org event - show own org users + independent users
        filteredUsers = allUsers.filter((u: User) => 
          u.organizationId === user?.organizationId || 
          u.organizationId === null
        );
      }
      
      setAvailableUsers(filteredUsers);
    }
    
    setFormData({
      ...formData,
      eventId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For admins, organizationId is optional (backend will use event's organization)
    // For org admins, organizationId is required
    if (!isAdmin && !user?.organizationId) {
      toast.error('You must belong to an organization to send invites');
      return;
    }

    try {
      const inviteData: any = {
        eventId: formData.eventId,
      };
      
      // Only include organizationId for org admins (admins don't need it)
      if (!isAdmin && user?.organizationId) {
        inviteData.invitedByOrganizationId = user.organizationId;
      }

      if (formData.userId) {
        inviteData.userId = formData.userId;
      } else if (formData.userEmail) {
        inviteData.userEmail = formData.userEmail;
        inviteData.userName = formData.userName;
      } else {
        toast.error('Please select a user or provide an email address');
        return;
      }

      await api.post('/invites', inviteData);
      setFormData({ eventId: '', userId: '', userEmail: '', userName: '' });
      setSelectedEvent(null);
      setShowForm(false);
      loadData();
      toast.success('Invite sent successfully!');
    } catch (error: any) {
      console.error('Failed to send invite:', error);
      toast.error(error.response?.data?.message || 'Failed to send invite');
    }
  };

  const handleCancel = async (inviteId: string) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;
    
    // Admins can cancel any invite, org admins need organizationId
    if (!isAdmin && !user?.organizationId) {
      toast.error('You must belong to an organization to cancel invites');
      return;
    }
    
    try {
      await api.post(`/invites/${inviteId}/cancel`);
      loadData();
      toast.success('Invite cancelled');
    } catch (error: any) {
      console.error('Failed to cancel invite:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel invite');
    }
  };


  // Client-side filtering with useMemo for performance
  // Must be called before any early returns (React hooks rule)
  const filteredInvites = useMemo(() => {
    // Apply status filter only
    if (filterStatus === 'all') {
      return allInvites;
    }
    return allInvites.filter((invite: Invite) => invite.status === filterStatus);
  }, [allInvites, filterStatus]);

  // Only block regular users without organization
  if (!isAdmin && !user?.organizationId) {
    return <div className="card">You must belong to an organization to manage invites</div>;
  }

  if (loading) {
    return <div className="card">Loading invites...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Event Invitations</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : 'Send Invite'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            <div className="form-group">
              <label>Event *</label>
              <select
                value={formData.eventId}
                onChange={(e) => handleEventChange(e.target.value)}
                required
              >
                <option value="">Select Event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} ({formatEventDateTime(event.startTime)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Invite User or External Individual</label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value, userEmail: '', userName: '' })}
              >
                <option value="">Select User (or use email below)</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) {u.organizationId ? `[Org]` : `[Independent]`}
                  </option>
                ))}
              </select>
            </div>

            {!formData.userId && (
              <>
                <div className="form-group">
                  <label>Email (External Individual) *</label>
                  <input
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                    required={!formData.userId}
                    placeholder="external@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Name (External Individual) *</label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    required={!formData.userId}
                    placeholder="Guest Name"
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={!formData.eventId || (!formData.userId && (!formData.userEmail || !formData.userName))}>
              Send Invite
            </button>
          </form>
        )}

        {/* Filter by Status */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '1rem' }}>Filter by Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--gray-300)',
              backgroundColor: 'var(--input-bg)',
              fontSize: '0.875rem',
              color: 'var(--gray-900)',
              cursor: 'pointer',
              minWidth: '180px'
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Invitee</th>
              <th>Type</th>
              <th>Status</th>
              <th>Sent At</th>
              <th>Responded At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvites.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>
                  No invites found. Send an invite!
                </td>
              </tr>
            ) : (
              filteredInvites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.event?.title || 'Unknown'}</td>
                  <td>
                    {invite.user 
                      ? `${invite.user.name} (${invite.user.email})`
                      : `${invite.userName} (${invite.userEmail})`}
                  </td>
                  <td>
                    <span className={`badge badge-${invite.userId ? 'success' : 'info'}`}>
                      {invite.userId ? 'User' : 'External'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${
                      invite.status === 'accepted' ? 'success' :
                      invite.status === 'declined' ? 'warning' :
                      invite.status === 'cancelled' ? 'danger' :
                      'info'
                    }`}>
                      {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </span>
                  </td>
                  <td>{formatTableDate(invite.createdAt)}</td>
                  <td>
                    {invite.respondedAt 
                      ? formatTableDate(invite.respondedAt)
                      : '-'}
                  </td>
                  <td>
                    {invite.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(invite.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Cancel Invite
                      </button>
                    )}
                    {invite.status !== 'pending' && (
                      <span style={{ color: '#666' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InvitesManagement;
