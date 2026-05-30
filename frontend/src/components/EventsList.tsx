import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import ActionsDropdown from './ActionsDropdown';
import { categorizeEvents, isPastEvent, isCurrentEvent, isUpcomingEvent } from '../utils/eventUtils';
import { getCurrentEasternTime } from '../utils/timeUtils';
import { formatTableDate, formatFullDate } from '../utils/dateFormatter';
import '../App.css';

interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: string;
  allowExternalAttendees: boolean;
  organization?: { name: string };
  organizationId?: string | null;
  resourceCount?: number;
}

interface Attendance {
  id: string;
  eventId: string;
  userId: string;
  checkedInAt: Date | null;
  event?: {
    startTime: string;
    endTime: string;
  };
}

function EventsList() {
  const { user, isAdmin, isOrg } = useAuth();
  const [allEvents, setAllEvents] = useState<Event[]>([]); // Store all events from API
  const [myAttendances, setMyAttendances] = useState<Attendance[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'registered' | 'ongoing' | 'past' | 'upcoming'>('available');
  const [eventFilter, setEventFilter] = useState<'all' | 'my-org' | 'global'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Set default tab based on role after mount
  useEffect(() => {
    if (isAdmin || isOrg) {
      setActiveTab('upcoming');
    }
  }, [isAdmin, isOrg]);

  // Load data once on mount and when user/filter changes (not on search)
  useEffect(() => {
    loadData();
  }, [user, eventFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (eventFilter === 'my-org' && user?.organizationId) {
        params.organizationId = user.organizationId;
      }
      
      const [eventsRes, attendancesRes] = await Promise.all([
        api.get('/events', { params }),
        user ? api.get('/attendances').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      
      const eventsData = eventsRes.data || [];
      setAllEvents(eventsData);
      
      // Filter attendances for current user and attach event details
      const allAttendances = attendancesRes.data || [];
      const userAttendances = allAttendances
        .filter((att: Attendance) => att.userId === user?.id)
        .map((att: Attendance) => {
          const event = eventsData.find((e: Event) => e.id === att.eventId);
          return { ...att, event };
        });
      setMyAttendances(userAttendances);

      // Calculate attendance counts per event
      const counts: Record<string, number> = {};
      eventsData.forEach((event: Event) => {
        counts[event.id] = allAttendances.filter((att: Attendance) => att.eventId === event.id).length;
      });
      setAttendanceCounts(counts);
    } catch (error: any) {
      console.error('Failed to load events:', error);
      toast.error(error.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering with useMemo for performance
  const filteredEvents = useMemo(() => {
    let filtered = [...allEvents];
    
    // Apply organization filter
    if (eventFilter === 'my-org' && user?.organizationId) {
      filtered = filtered.filter((e: Event) => e.organizationId === user.organizationId);
    } else if (eventFilter === 'global') {
      filtered = filtered.filter((e: Event) => 
        e.organizationId !== user?.organizationId || e.allowExternalAttendees
      );
    }
    
    // Apply search filter (instant, no API call)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((e: Event) => 
        e.title?.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [allEvents, eventFilter, user?.organizationId, searchTerm]);

  const registerForEvent = async (eventId: string) => {
    if (!user) {
      toast.error('Please login to register for events');
      return;
    }
    
    try {
      await api.post('/attendances', {
        eventId,
        userId: user.id,
      });
      toast.success('Successfully registered for event!');
      loadData();
    } catch (error: any) {
      console.error('Failed to register:', error);
      toast.error(error.response?.data?.message || 'Failed to register for event');
    }
  };

  const unregisterFromEvent = async (attendanceId: string) => {
    if (!confirm('Are you sure you want to unregister from this event?')) return;
    
    try {
      await api.delete(`/attendances/${attendanceId}`);
      toast.success('Successfully unregistered from event');
      loadData();
    } catch (error: any) {
      console.error('Failed to unregister:', error);
      toast.error(error.response?.data?.message || 'Failed to unregister');
    }
  };

  const checkInForEvent = async (attendanceId: string) => {
    try {
      await api.post(`/attendances/${attendanceId}/checkin`);
      toast.success('Successfully checked in!');
      loadData();
    } catch (error: any) {
      console.error('Failed to check in:', error);
      toast.error(error.response?.data?.message || 'Failed to check in');
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted');
      loadData();
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      toast.error(error.response?.data?.message || 'Failed to delete event');
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
  // Events are categorized into three time-based categories:
  // 1. Past Events: event.endTime < now (event has ended)
  // 2. Current/Ongoing Events: now >= event.startTime && now <= event.endTime (event is happening now)
  // 3. Upcoming Events: now < event.startTime (event hasn't started yet)
  //
  // This logic is centralized in utils/eventUtils.ts for consistency across the application.
  
  // Segregate events by registration status
  const registeredEventIds = new Set(myAttendances.map(att => att.eventId));
  const allRegisteredEvents = filteredEvents.filter(event => registeredEventIds.has(event.id));
  const availableEvents = filteredEvents.filter(event => !registeredEventIds.has(event.id));
  
  // Categorize all events by time using utility functions
  // This ensures consistent logic: past, current, and upcoming are clearly defined
  const { pastEvents, currentEvents, upcomingEvents } = categorizeEvents(filteredEvents);
  
  // For regular users: filter registered events by time category
  // 
  // CONSTRAINT 1: Past events should ONLY include registered events that have ended
  //   - Regular users cannot see past events they're not registered for
  //   - This ensures data isolation and privacy
  const userPastEvents = allRegisteredEvents.filter(event => isPastEvent(event));
  
  // CONSTRAINT 2: "Registered" tab should NOT include past events
  //   - If an event ends, it must move from "Registered" to "Past Events"
  const userOngoingEvents = allRegisteredEvents.filter(event => isCurrentEvent(event));
  const userUpcomingRegisteredEvents = allRegisteredEvents.filter(event => isUpcomingEvent(event));
  
  // CONSTRAINT 3: Once an event starts, it moves from "Registered" to "Ongoing"
  //   - "Registered" tab shows ONLY upcoming events (not ongoing)
  //   - "Ongoing" tab shows events that have started but not ended
  //   - Events cannot appear in both tabs simultaneously
  const userRegisteredEvents = userUpcomingRegisteredEvents; // Only upcoming, NOT ongoing
  
  // For admins/org admins: use all events (no registration filter needed)
  // - Admins see all events regardless of registration status
  // - Logic: Use the pre-categorized events directly
  const adminOngoingEvents = currentEvents;
  const adminPastEvents = pastEvents;

  const displayEvents = activeTab === 'available' 
    ? availableEvents 
    : activeTab === 'registered'
    ? (isAdmin || isOrg ? allRegisteredEvents : userRegisteredEvents) // For users: exclude past events
    : activeTab === 'ongoing'
    ? (isAdmin || isOrg ? adminOngoingEvents : userOngoingEvents)
    : activeTab === 'past'
    ? (isAdmin || isOrg ? adminPastEvents : userPastEvents) // For users: only registered past events
    : activeTab === 'upcoming'
    ? upcomingEvents
    : allRegisteredEvents;

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">Events</h1>
        <div className="card-actions">
          {(isAdmin || isOrg) && (
            <Link to="/events/new" className="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Event
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <svg
            className="search-input-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search events by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-row">
          <label className="filter-label">Filter:</label>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as 'all' | 'my-org' | 'global')}
            className="filter-select-field"
          >
            <option value="all">All Events</option>
            {user?.organizationId && (
              <option value="my-org">My Organization</option>
            )}
            <option value="global">Global Events</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation for Users */}
      {!isAdmin && !isOrg && (
        <div className="tab-bar">
          <button
            onClick={() => setActiveTab('available')}
            className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          >
            Available ({availableEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('registered')}
            className={`tab-btn ${activeTab === 'registered' ? 'active' : ''}`}
          >
            Registered ({userRegisteredEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`tab-btn ${activeTab === 'ongoing' ? 'active' : ''}`}
          >
            Ongoing ({userOngoingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          >
            Past ({userPastEvents.length})
          </button>
        </div>
      )}

      {/* Tab Navigation for Admins/Org Admins */}
      {(isAdmin || isOrg) && (
        <div className="tab-bar">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`tab-btn ${activeTab === 'ongoing' ? 'active' : ''}`}
          >
            Ongoing ({adminOngoingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          >
            Past ({adminPastEvents.length})
          </button>
        </div>
      )}

      {displayEvents.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <h3>No events found</h3>
          <p>
            {activeTab === 'available' 
              ? 'No available events at the moment. Check back later!' 
              : activeTab === 'ongoing'
              ? 'No ongoing events at the moment.'
              : activeTab === 'past'
              ? 'No past events found.'
              : activeTab === 'upcoming'
              ? 'No upcoming events found.'
              : 'You haven\'t registered for any events yet.'}
          </p>
          {(isAdmin || isOrg) && activeTab === 'available' && (
            <Link to="/events/new" className="btn btn-primary">
              Create Event
            </Link>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Organization</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Capacity</th>
                <th>Status</th>
                {(isAdmin || isOrg) && <th>External</th>}
                {(isAdmin || isOrg) && <th>Resources</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayEvents.map((event) => {
                const attendance = myAttendances.find(att => att.eventId === event.id);
                const isRegistered = !!attendance;
                
                return (
                  <tr key={event.id}>
                    <td style={{ fontWeight: 600 }}>{event.title}</td>
                    <td>{event.organization?.name || 'N/A'}</td>
                    <td>{formatTableDate(event.startTime)}</td>
                    <td>{formatTableDate(event.endTime)}</td>
                    <td>{event.capacity}</td>
                    <td>
                      <span className={`badge badge-${
                        event.status === 'published' ? 'success' :
                        event.status === 'draft' ? 'warning' :
                        'gray'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    {(isAdmin || isOrg) && (
                      <td>
                        {event.allowExternalAttendees ? (
                          <span className="badge badge-info">Yes</span>
                        ) : (
                          <span className="badge badge-gray">No</span>
                        )}
                      </td>
                    )}
                    {(isAdmin || isOrg) && (
                      <td>
                        {/* Show resource count only to the owning org admin */}
                        {(isAdmin || (isOrg && event.organizationId === user?.organizationId)) ? (
                          <span className="badge badge-info">
                            {event.resourceCount || 0} resource{(event.resourceCount || 0) !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="badge badge-gray" title="Resource count only visible to event owner">
                            -
                          </span>
                        )}
                      </td>
                    )}
                    <td>
                      {(() => {
                        const actions: Array<{ label: string; onClick?: () => void; to?: string; danger?: boolean }> = [];
                        const now = getCurrentEasternTime();
                        const eventStart = new Date(event.startTime);
                        const eventEnd = new Date(event.endTime);
                        const canCheckIn = isRegistered && !attendance?.checkedInAt && now >= eventStart && now <= eventEnd;
                        const isCheckedIn = attendance?.checkedInAt;

                        // User actions (for regular users)
                        if (!isAdmin && !isOrg) {
                          if (!isRegistered) {
                            const attendanceCount = attendanceCounts[event.id] || 0;
                            const isFull = event.capacity > 0 && attendanceCount >= event.capacity;
                            if (!isFull) {
                              actions.push({
                                label: 'Register',
                                onClick: () => registerForEvent(event.id),
                              });
                            }
                            // Note: "Full" status is shown via disabled button, not as an action
                          } else {
                            actions.push({
                              label: 'View Attendees',
                              to: `/events/${event.id}/attendees`,
                            });
                            if (canCheckIn) {
                              actions.push({
                                label: 'Check In',
                                onClick: () => checkInForEvent(attendance.id),
                              });
                            }
                            // Check if 15 minutes have passed since event start
                            const eventStartTime = attendance.event ? new Date(attendance.event.startTime) : null;
                            const now = getCurrentEasternTime();
                            const canDeregister = eventStartTime 
                              ? now < new Date(eventStartTime.getTime() + 15 * 60 * 1000) // 15 minutes after start
                              : true; // If no event data, allow (backend will validate)
                            
                            if (canDeregister) {
                              actions.push({
                                label: 'Unregister',
                                onClick: () => {
                                  if (confirm('Are you sure you want to unregister from this event?')) {
                                    unregisterFromEvent(attendance.id);
                                  }
                                },
                                danger: true,
                              });
                            }
                          }
                        }

                        // Admin/Org Admin actions
                        if (isAdmin || (isOrg && event.organizationId === user?.organizationId)) {
                          actions.push({
                            label: 'View Attendees',
                            to: `/events/${event.id}/attendees`,
                          });
                          // Org admins cannot edit/delete past events
                          const isEventPast = isPastEvent(event);
                          if (isAdmin || !isEventPast) {
                            actions.push({
                              label: 'Edit Event',
                              to: `/events/${event.id}/edit`,
                            });
                            actions.push({
                              label: 'Delete Event',
                              onClick: () => {
                                if (confirm('Are you sure you want to delete this event?')) {
                                  deleteEvent(event.id);
                                }
                              },
                              danger: true,
                            });
                          }
                        }

                        // Render dropdown with check-in badge if applicable
                        return (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {isCheckedIn && attendance.checkedInAt && (
                              <span className="badge badge-success" title={`Checked in: ${formatFullDate(attendance.checkedInAt)}`}>
                                ✓ Checked In
                              </span>
                            )}
                            {actions.length > 0 && <ActionsDropdown actions={actions} />}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EventsList;
