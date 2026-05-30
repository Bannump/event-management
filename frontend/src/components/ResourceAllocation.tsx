import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { isPastEvent } from '../utils/eventUtils';
import '../App.css';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  availableQuantity: number;
  maxConcurrentUsage?: number | null;
}

interface Allocation {
  id: string;
  eventId: string;
  resourceId: string;
  quantity: number;
  event?: Event;
  resource?: Resource;
}

interface AvailabilityInfo {
  totalQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  maxConcurrentUsage?: number;
  currentConcurrentUsage: number;
  remainingConcurrentCapacity?: number;
}

function ResourceAllocation() {
  const { user, isAdmin, isOrg } = useAuth();
  const [allAllocations, setAllAllocations] = useState<Allocation[]>([]); // Store all allocations from API
  const [events, setEvents] = useState<Event[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [formData, setFormData] = useState({
    eventId: '',
    resourceId: '',
    quantity: 1,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<string | null>(null);
  const [editingAllocationData, setEditingAllocationData] = useState<Allocation | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [availabilityInfo, setAvailabilityInfo] = useState<AvailabilityInfo | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (!isAdmin && user?.organizationId) {
        params.organizationId = user.organizationId;
      }
      
      const [allocationsRes, eventsRes, resourcesRes] = await Promise.all([
        api.get('/allocations'),
        api.get('/events', { params }),
        api.get('/resources', { params }),
      ]);
      setAllAllocations(allocationsRes.data || []);
      setEvents(eventsRes.data || []);
      setResources(resourcesRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering with useMemo for performance
  const allocations = useMemo(() => {
    if (!searchTerm.trim()) {
      return allAllocations;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    return allAllocations.filter((alloc: Allocation) => 
      alloc.event?.title?.toLowerCase().includes(searchLower) ||
      alloc.resource?.name?.toLowerCase().includes(searchLower)
    );
  }, [allAllocations, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/allocations', formData);
      setFormData({ eventId: '', resourceId: '', quantity: 1 });
      setShowForm(false);
      loadData();
      toast.success('Resource allocated successfully');
    } catch (error: any) {
      console.error('Failed to allocate resource:', error);
      toast.error(error.response?.data?.message || 'Failed to allocate resource');
    }
  };

  const handleEdit = async (allocation: Allocation) => {
    setEditingAllocation(allocation.id);
    setEditingAllocationData(allocation);
    setEditQuantity(allocation.quantity);
    setAvailabilityInfo(null);
    
    // Load availability information for this allocation
    if (allocation.event && allocation.resource) {
      setLoadingAvailability(true);
      try {
        const response = await api.get(`/resources/${allocation.resourceId}/availability`, {
          params: {
            startTime: new Date(allocation.event.startTime).toISOString(),
            endTime: new Date(allocation.event.endTime).toISOString(),
            excludeEventId: allocation.eventId, // Exclude current event from conflicts
          },
        });
        setAvailabilityInfo(response.data.availabilityDetails);
      } catch (error) {
        console.error('Failed to load availability:', error);
        setAvailabilityInfo(null);
      } finally {
        setLoadingAvailability(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingAllocation(null);
    setEditingAllocationData(null);
    setEditQuantity(1);
    setAvailabilityInfo(null);
  };

  const handleUpdateAllocation = async (id: string) => {
    try {
      await api.patch(`/allocations/${id}`, { quantity: editQuantity });
      handleCancelEdit();
      loadData();
      toast.success('Allocation updated successfully');
    } catch (error: any) {
      console.error('Failed to update allocation:', error);
      toast.error(error.response?.data?.message || 'Failed to update allocation');
    }
  };

  const deleteAllocation = async (id: string) => {
    if (!confirm('Are you sure you want to remove this allocation?')) return;
    try {
      await api.delete(`/allocations/${id}`);
      loadData();
      toast.success('Allocation deleted successfully');
    } catch (error) {
      console.error('Failed to delete allocation:', error);
      toast.error('Failed to delete allocation');
    }
  };

  if (!user?.organizationId && !isAdmin) {
    return <div className="card">You must belong to an organization to manage allocations</div>;
  }

  if (loading) {
    return <div className="card">Loading allocations...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>Resource Allocations</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              {showForm ? 'Cancel' : 'Allocate Resource'}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <svg
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: 'var(--gray-400)',
                pointerEvents: 'none',
                zIndex: 1
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by resource name or event title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                fontSize: '0.9375rem',
                lineHeight: '1.5',
                color: 'var(--gray-900)',
                background: 'var(--input-bg)',
                border: '1px solid var(--gray-300)',
                borderRadius: 'var(--radius-md)',
                transition: 'all 0.2s ease',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-500)';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--gray-300)';
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            />
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
            <div className="form-group">
              <label>Event *</label>
              <select
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                required
              >
                <option value="">Select Event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} ({new Date(event.startTime).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Resource *</label>
              <select
                value={formData.resourceId}
                onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                required
              >
                <option value="">Select Resource</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} ({resource.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Allocate</button>
          </form>
        )}

        {allocations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
            No allocations found. Allocate a resource to an event!
          </div>
        ) : (
          (() => {
            const now = new Date();
            
            // Helper function to format date/time
            const formatDateTime = (dateString: string): string => {
              const date = new Date(dateString);
              return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            };

            // Helper function to get event status
            const getEventStatus = (startTime: string, endTime: string): { label: string; badge: string } => {
              const start = new Date(startTime);
              const end = new Date(endTime);
              if (end < now) return { label: 'Past', badge: 'gray' };
              if (start <= now && end >= now) return { label: 'Ongoing', badge: 'info' };
              return { label: 'Upcoming', badge: 'success' };
            };

            // Helper function to calculate duration
            const calculateDuration = (startTime: string, endTime: string): string => {
              const start = new Date(startTime);
              const end = new Date(endTime);
              const diffMs = end.getTime() - start.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              
              if (diffHours > 0) {
                return `${diffHours}h ${diffMinutes > 0 ? `${diffMinutes}m` : ''}`.trim();
              }
              return `${diffMinutes}m`;
            };

            // Group allocations by resource
            const allocationsWithData = allocations
              .filter((alloc) => {
                const event = events.find((e) => e.id === alloc.eventId);
                return event && event.id;
              })
              .map((allocation) => {
                const event = events.find((e) => e.id === allocation.eventId);
                const resource = resources.find((r) => r.id === allocation.resourceId);
                return {
                  ...allocation,
                  event,
                  resource,
                };
              });

            // Group by resource
            const groupedByResource: { [resourceId: string]: typeof allocationsWithData } = {};
            allocationsWithData.forEach((alloc) => {
              if (alloc.resource) {
                if (!groupedByResource[alloc.resourceId]) {
                  groupedByResource[alloc.resourceId] = [];
                }
                groupedByResource[alloc.resourceId].push(alloc);
              }
            });

            const resourceIds = Object.keys(groupedByResource).sort((a, b) => {
              const resourceA = resources.find((r) => r.id === a);
              const resourceB = resources.find((r) => r.id === b);
              return (resourceA?.name || '').localeCompare(resourceB?.name || '');
            });

            return resourceIds.map((resourceId) => {
              const resource = resources.find((r) => r.id === resourceId);
              let resourceAllocations = groupedByResource[resourceId];

              // Sort allocations by start time (upcoming first, then past)
              resourceAllocations = [...resourceAllocations].sort((a, b) => {
                const startA = a.event?.startTime ? new Date(a.event.startTime).getTime() : 0;
                const startB = b.event?.startTime ? new Date(b.event.startTime).getTime() : 0;
                return startB - startA; // Descending (newest/upcoming first)
              });

              return (
                <div key={resourceId} style={{ marginBottom: '2rem' }}>
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      background: 'var(--gray-200)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '0.75rem',
                      border: '1px solid var(--gray-200)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                          {resource?.name || 'Unknown Resource'}
                        </h3>
                        <span
                          className={`badge badge-${
                            resource?.type === 'exclusive' ? 'warning' : resource?.type === 'shareable' ? 'info' : 'success'
                          }`}
                        >
                          {resource?.type || 'Unknown'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                        <span>
                          <strong>{resourceAllocations.length}</strong> allocation{resourceAllocations.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Duration</th>
                          <th>Status</th>
                          <th>Quantity</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resourceAllocations.map((allocation) => {
                          const startTime = allocation.event?.startTime || '';
                          const endTime = allocation.event?.endTime || '';
                          const duration = startTime && endTime ? calculateDuration(startTime, endTime) : 'N/A';
                          const status = startTime && endTime ? getEventStatus(startTime, endTime) : { label: 'Unknown', badge: 'gray' };

                          return (
                            <tr key={allocation.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                                  {allocation.event?.title || 'Unknown'}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                                {startTime ? formatDateTime(startTime) : 'N/A'}
                              </td>
                              <td style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                                {endTime ? formatDateTime(endTime) : 'N/A'}
                              </td>
                              <td style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                                {duration}
                              </td>
                              <td>
                                <span className={`badge badge-${status.badge}`} style={{ fontSize: '0.75rem' }}>
                                  {status.label}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge badge-${allocation.quantity > 1 ? 'info' : 'gray'}`}>
                                  {allocation.quantity}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {/* Org admins cannot edit/delete allocations for past events */}
                                  {(() => {
                                    const isAllocationPast = allocation.event ? isPastEvent(allocation.event) : false;
                                    const canEdit = isAdmin || (isOrg && !isAllocationPast);
                                    
                                    if (!canEdit) {
                                      return (
                                        <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                                          Past event
                                        </span>
                                      );
                                    }
                                    
                                    return (
                                      <>
                                        <button
                                          onClick={() => handleEdit(allocation)}
                                          className="btn btn-sm btn-secondary"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => deleteAllocation(allocation.id)}
                                          className="btn btn-sm btn-danger"
                                        >
                                          Remove
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Edit Allocation Overlay Modal */}
      {editingAllocation && editingAllocationData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={handleCancelEdit}
        >
          <div
            style={{
              background: 'var(--input-bg)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                Edit Allocation Quantity
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', margin: 0 }}>
                {editingAllocationData.resource?.name} - {editingAllocationData.event?.title}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="editQuantity"
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--gray-700)',
                  marginBottom: '0.5rem',
                }}
              >
                Quantity *
              </label>
              <input
                id="editQuantity"
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
            </div>

            {/* Available Stock Information */}
            {loadingAvailability ? (
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--gray-200)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--gray-200)',
                  textAlign: 'center',
                  color: 'var(--gray-500)',
                  marginBottom: '1.5rem',
                }}
              >
                Loading availability...
              </div>
            ) : availabilityInfo && editingAllocationData.resource ? (
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--blue-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--blue-200)',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>Available Stock:</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: (() => {
                        if (editingAllocationData.resource.type === 'consumable') {
                          const available = availabilityInfo.remainingQuantity + editingAllocationData.quantity;
                          return available > 0 ? 'var(--green-700)' : 'var(--red-700)';
                        } else if (editingAllocationData.resource.type === 'shareable' && availabilityInfo.remainingConcurrentCapacity !== undefined) {
                          return availabilityInfo.remainingConcurrentCapacity > 0 ? 'var(--green-700)' : 'var(--red-700)';
                        } else {
                          return availabilityInfo.remainingQuantity > 0 ? 'var(--green-700)' : 'var(--red-700)';
                        }
                      })(),
                      fontSize: '1.125rem',
                    }}
                  >
                    {(() => {
                      if (editingAllocationData.resource.type === 'consumable') {
                        return `${availabilityInfo.remainingQuantity + editingAllocationData.quantity} units`;
                      } else if (editingAllocationData.resource.type === 'shareable' && availabilityInfo.remainingConcurrentCapacity !== undefined) {
                        return `${availabilityInfo.remainingConcurrentCapacity} units`;
                      } else {
                        return `${availabilityInfo.remainingQuantity} units`;
                      }
                    })()}
                  </span>
                </div>
                {editingAllocationData.resource.type === 'consumable' && 
                 editQuantity > availabilityInfo.remainingQuantity + editingAllocationData.quantity && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--red-700)', marginTop: '0.5rem' }}>
                    ⚠️ Requested quantity ({editQuantity}) exceeds available ({availabilityInfo.remainingQuantity + editingAllocationData.quantity})
                  </div>
                )}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--gray-200)',
              }}
            >
              <button
                onClick={handleCancelEdit}
                className="btn btn-secondary"
                style={{ minWidth: '100px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateAllocation(editingAllocation)}
                className="btn btn-primary"
                style={{ minWidth: '100px' }}
                disabled={
                  editQuantity === editingAllocationData.quantity ||
                  editQuantity < 1 ||
                  !!(availabilityInfo &&
                   editingAllocationData.resource?.type === 'consumable' &&
                   availabilityInfo.remainingQuantity + editingAllocationData.quantity < editQuantity)
                }
                title={
                  editQuantity === editingAllocationData.quantity
                    ? 'No changes to save'
                    : editQuantity < 1
                    ? 'Quantity must be at least 1'
                    : availabilityInfo && 
                      editingAllocationData.resource?.type === 'consumable' && 
                      availabilityInfo.remainingQuantity + editingAllocationData.quantity < editQuantity
                    ? `Insufficient availability. Available: ${availabilityInfo.remainingQuantity + editingAllocationData.quantity}, Requested: ${editQuantity}`
                    : undefined
                }
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourceAllocation;
