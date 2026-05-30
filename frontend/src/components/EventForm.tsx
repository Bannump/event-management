import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import ResourceAvailabilityViewer from './ResourceAvailabilityViewer';
import toast from 'react-hot-toast';
import { isPastEvent } from '../utils/eventUtils';
import '../App.css';

interface Resource {
  id: string;
  name: string;
  type: string;
  availableQuantity: number;
  maxConcurrentUsage: number | null;
  isGlobal: boolean;
  organizationId: string | null;
}

interface ResourceAllocation {
  id: string;
  resourceId: string;
  quantity: number;
  resource?: Resource;
  availabilityDetails?: any;
}

interface EventFormProps {
  id?: string;
  onClose?: () => void;
}

function EventForm({ id: propId, onClose }: EventFormProps = {}) {
  const params = useParams<{ id: string }>();
  const id = propId ?? params.id;
  const navigate = useNavigate();
  const handleClose = onClose ?? (() => navigate('/events'));
  const { user, isAdmin, isOrg } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceAllocations, setResourceAllocations] = useState<ResourceAllocation[]>([]);
  const [event, setEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    capacity: 0,
    status: 'draft',
    allowExternalAttendees: false,
    organizationId: user?.organizationId || '',
    parentEventId: '',
  });
  const [parentEvents, setParentEvents] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      if (!id) {
        // Only set default org for org admins, admins can choose
        if (isOrg) {
          setEvent((prev) => ({ ...prev, organizationId: user.organizationId || '' }));
        } else if (isAdmin) {
          setEvent((prev) => ({ ...prev, organizationId: '' }));
        }
      }
      loadOrganizations();
      loadParentEvents();
      loadResources();
    }
    if (id) {
      loadEvent();
    }
  }, [id, user]);

  const loadEvent = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      const eventData = response.data;
      
      // Org admins cannot edit past events
      if (isOrg && !isAdmin && isPastEvent(eventData)) {
        toast.error('Cannot edit past events');
        handleClose();
        return;
      }

      setEvent({
        title: eventData.title || '',
        description: eventData.description || '',
        startTime: eventData.startTime ? new Date(eventData.startTime).toISOString().slice(0, 16) : '',
        endTime: eventData.endTime ? new Date(eventData.endTime).toISOString().slice(0, 16) : '',
        capacity: eventData.capacity || 0,
        status: eventData.status || 'draft',
        allowExternalAttendees: eventData.allowExternalAttendees || false,
        organizationId: eventData.organizationId || user?.organizationId || '',
        parentEventId: eventData.parentEventId || '',
      });
      
      // Load existing resource allocations
      if (id) {
        const allocationsRes = await api.get(`/allocations?eventId=${id}`);
        setResourceAllocations(allocationsRes.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load event:', error);
      toast.error(error.response?.data?.message || 'Failed to load event');
    }
  };

  const loadResources = async () => {
    try {
      const response = await api.get('/resources');
      setResources(response.data || []);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const loadOrganizations = async () => {
    if (!isAdmin) return; // Only admins need to load organizations
    try {
      const response = await api.get('/organizations');
      setOrganizations(response.data || []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadParentEvents = async () => {
    try {
      const params: any = {};
      if (!isAdmin && user?.organizationId) {
        params.organizationId = user.organizationId;
      }
      const response = await api.get('/events', { params });
      setParentEvents(response.data.filter((e: any) => e.id !== id));
    } catch (error) {
      console.error('Failed to load parent events:', error);
    }
  };

  const addResourceAllocation = () => {
    setResourceAllocations([...resourceAllocations, { id: '', resourceId: '', quantity: 1 }]);
  };

  const updateResourceAllocation = (index: number, field: 'resourceId' | 'quantity', value: string | number) => {
    const updated = [...resourceAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setResourceAllocations(updated);
  };

  const removeResourceAllocation = (index: number) => {
    setResourceAllocations(resourceAllocations.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (loading) {
      return;
    }

    // Validate resource availability before submission
    const newAllocations = resourceAllocations.filter(a => !a.id && a.resourceId);
    if (newAllocations.length > 0 && event.startTime && event.endTime) {
      const availabilityChecks = newAllocations.map(async (alloc) => {
        if (!alloc.availabilityDetails) {
          // If availability wasn't checked, check it now
          try {
            const response = await api.get(`/resources/${alloc.resourceId}/availability`, {
              params: {
                startTime: new Date(event.startTime).toISOString(),
                endTime: new Date(event.endTime).toISOString(),
              },
            });
            return {
              allocation: alloc,
              available: response.data.available && response.data.availableQuantity >= alloc.quantity,
              details: response.data,
            };
          } catch (err) {
            return { allocation: alloc, available: false, details: null };
          }
        } else {
          return {
            allocation: alloc,
            available: alloc.availabilityDetails.available && alloc.availabilityDetails.availableQuantity >= alloc.quantity,
            details: alloc.availabilityDetails,
          };
        }
      });

      const results = await Promise.all(availabilityChecks);
      const unavailable = results.filter(r => !r.available);
      
      if (unavailable.length > 0) {
        const resourceNames = unavailable.map(r => {
          const res = resources.find(res => res.id === r.allocation.resourceId);
          const details = r.details?.availabilityDetails;
          const available = details?.remainingQuantity || 0;
          const requested = r.allocation.quantity;
          return `${res?.name || 'Unknown'} (Available: ${available}, Requested: ${requested})`;
        }).join('\n');
        toast.error(
          `The following resources are not available in the requested quantity:\n${resourceNames}\n\nPlease adjust your selections or event time.`,
          { duration: 6000 }
        );
        return;
      }
    }
    
    setLoading(true);
    let createdEventId: string | null = null;
    
    try {
      const eventData = {
        ...event,
        startTime: new Date(event.startTime).toISOString(),
        endTime: new Date(event.endTime).toISOString(),
        parentEventId: event.parentEventId || undefined,
      };

      let eventId: string;
      if (id) {
        await api.patch(`/events/${id}`, eventData);
        eventId = id;
      } else {
        const createdEvent = await api.post('/events', eventData);
        eventId = createdEvent.data.id;
        createdEventId = eventId; // Track if we created a new event
      }

      // Handle resource allocations
      const existingAllocations = resourceAllocations.filter(a => a.id);
      const newAllocationsToCreate = resourceAllocations.filter(a => !a.id && a.resourceId);
      
      // Get current allocations from database
      const currentAllocations = await api.get(`/allocations?eventId=${eventId}`);
      const currentAllocationsData = currentAllocations.data || [];
      const currentIds = currentAllocationsData.map((a: any) => a.id);
      const keptIds = existingAllocations.map(a => a.id);
      const toDelete = currentIds.filter((id: string) => !keptIds.includes(id));
      
      // Delete removed allocations
      await Promise.all(toDelete.map((allocId: string) => api.delete(`/allocations/${allocId}`)));

      // Update existing allocations that have changed
      const allocationsToUpdate = existingAllocations.filter(alloc => {
        const current = currentAllocationsData.find((a: any) => a.id === alloc.id);
        return current && (current.quantity !== alloc.quantity || current.resourceId !== alloc.resourceId);
      });

      // Validate and update existing allocations
      try {
        await Promise.all(
          allocationsToUpdate.map(async (alloc) => {
            // Validate availability if quantity or resource changed
            if (event.startTime && event.endTime) {
              try {
                const availabilityResponse = await api.get(`/resources/${alloc.resourceId}/availability`, {
                  params: {
                    startTime: new Date(event.startTime).toISOString(),
                    endTime: new Date(event.endTime).toISOString(),
                    excludeEventId: eventId, // Exclude current event from conflicts
                  },
                });
                
                const availability = availabilityResponse.data;
                // Check if the new quantity is available
                if (availability.availableQuantity < alloc.quantity) {
                  const resource = resources.find(r => r.id === alloc.resourceId);
                  throw new Error(
                    `Insufficient availability for ${resource?.name || 'resource'}. ` +
                    `Available: ${availability.availableQuantity}, Requested: ${alloc.quantity}`
                  );
                }
              } catch (err: any) {
                if (err.response?.status === 400 || err.message) {
                  throw err;
                }
                // If availability check fails for other reasons, still try to update
                console.warn('Availability check failed, proceeding with update:', err);
                toast.error(err.response?.data?.message || 'Availability check failed');
              }
            }
            
            // Update the allocation
            return api.patch(`/allocations/${alloc.id}`, {
              quantity: alloc.quantity,
              resourceId: alloc.resourceId !== currentAllocationsData.find((a: any) => a.id === alloc.id)?.resourceId
                ? alloc.resourceId
                : undefined,
            });
          })
        );
      } catch (updateError: any) {
        // If update fails and we just created the event, delete it
        if (createdEventId && !id) {
          try {
            await api.delete(`/events/${createdEventId}`);
          } catch (deleteError: any) {
            console.error('Failed to delete event after allocation update error:', deleteError);
            toast.error('Failed to clean up event after error');
          }
        }
        throw updateError;
      }

      // Create new allocations - validate before creating event if it's new
      try {
        await Promise.all(
          newAllocationsToCreate.map(alloc => 
            api.post('/allocations', {
              eventId,
              resourceId: alloc.resourceId,
              quantity: alloc.quantity,
            })
          )
        );
      } catch (allocationError: any) {
        // If allocation fails and we just created the event, delete it
        if (createdEventId && !id) {
          try {
            await api.delete(`/events/${createdEventId}`);
          } catch (deleteError: any) {
            console.error('Failed to delete event after allocation error:', deleteError);
            toast.error('Failed to clean up event after error');
          }
        }
        // Re-throw the allocation error
        throw allocationError;
      }

      toast.success(id ? 'Event updated successfully' : 'Event created successfully');
      handleClose();
    } catch (error: any) {
      console.error('Failed to save event:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save event';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter resources based on event organization
  const availableResources = resources.filter(r => {
    if (isAdmin) return true;
    if (!event.organizationId) return r.isGlobal;
    return r.organizationId === event.organizationId || r.isGlobal;
  });

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">{id ? 'Edit Event' : 'Create New Event'}</h1>
      </div>
      <form onSubmit={handleSubmit}>
        {/* Event Details Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--gray-900)' }}>
            Event Details
          </h2>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={event.description}
              onChange={(e) => setEvent({ ...event, description: e.target.value })}
              rows={4}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="datetime-local"
                value={event.startTime}
                onChange={(e) => setEvent({ ...event, startTime: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input
                type="datetime-local"
                value={event.endTime}
                onChange={(e) => setEvent({ ...event, endTime: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Capacity *</label>
              <input
                type="number"
                min="0"
                value={event.capacity}
                onChange={(e) => setEvent({ ...event, capacity: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={event.status}
                onChange={(e) => setEvent({ ...event, status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          {isAdmin && (
            <div className="form-group">
              <label>Organization *</label>
              <select
                value={event.organizationId}
                onChange={(e) => setEvent({ ...event, organizationId: e.target.value })}
                required
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <small>Admin can create events for any organization</small>
            </div>
          )}
          {isOrg && (
            <div className="form-group">
              <label>Organization</label>
              <input
                type="text"
                value={organizations.find((o: any) => o.id === event.organizationId)?.name || 'Your Organization'}
                disabled
              />
              <small>Events are automatically assigned to your organization</small>
            </div>
          )}
          <div className="form-group">
            <label>Parent Event (optional)</label>
            <select
              value={event.parentEventId}
              onChange={(e) => setEvent({ ...event, parentEventId: e.target.value })}
            >
              <option value="">None</option>
              {parentEvents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={event.allowExternalAttendees}
                onChange={(e) => setEvent({ ...event, allowExternalAttendees: e.target.checked })}
              />
              Allow External Attendees
            </label>
          </div>
        </div>

        {/* Resource Allocation Section */}
        {(isAdmin || isOrg) && (
          <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--gray-200)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                Resource Allocation
              </h2>
              <button
                type="button"
                onClick={addResourceAllocation}
                className="btn btn-sm btn-secondary"
              >
                + Add Resource
              </button>
            </div>
            {resourceAllocations.length === 0 ? (
              <p style={{ color: 'var(--gray-600)', fontStyle: 'italic' }}>
                No resources allocated. Click "Add Resource" to assign resources to this event.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {resourceAllocations.map((allocation, index) => {
                  const selectedResource = resources.find(r => r.id === allocation.resourceId);
                  return (
                    <div key={index} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr auto',
                      gap: '1rem',
                      alignItems: 'end',
                      padding: '1rem',
                      background: 'var(--input-bg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--gray-200)'
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          Resource *
                        </label>
                        <select
                          value={allocation.resourceId}
                          onChange={(e) => updateResourceAllocation(index, 'resourceId', e.target.value)}
                          required
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }}
                        >
                          <option value="">Select Resource</option>
                          {availableResources.map((resource) => (
                            <option key={resource.id} value={resource.id}>
                              {resource.name} ({resource.type}) {resource.isGlobal ? '[Global]' : ''}
                            </option>
                          ))}
                        </select>
                        {selectedResource && (
                          <>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                              Total: {selectedResource.availableQuantity} | 
                              {selectedResource.type === 'shareable' && selectedResource.maxConcurrentUsage && 
                                ` Max Concurrent: ${selectedResource.maxConcurrentUsage}`}
                            </div>
                            {event.startTime && event.endTime && (
                              <ResourceAvailabilityViewer
                                resourceId={allocation.resourceId}
                                resource={selectedResource}
                                startTime={event.startTime}
                                endTime={event.endTime}
                                requestedQuantity={allocation.quantity}
                                excludeEventId={id || undefined}
                                onAvailabilityCheck={(_available, details) => {
                                  // Store availability status for validation
                                  const updated = [...resourceAllocations];
                                  updated[index] = { ...updated[index], availabilityDetails: details };
                                  setResourceAllocations(updated);
                                }}
                              />
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={allocation.quantity}
                          onChange={(e) => updateResourceAllocation(index, 'quantity', parseInt(e.target.value))}
                          required
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeResourceAllocation(index)}
                        className="btn btn-sm btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : id ? 'Update Event' : 'Create Event'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EventForm;
