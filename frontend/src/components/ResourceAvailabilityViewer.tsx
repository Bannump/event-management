import { useState, useEffect } from 'react';
import api from '../services/api';
import '../App.css';

interface Resource {
  id: string;
  name: string;
  type: string;
  availableQuantity: number;
  maxConcurrentUsage: number | null;
}

interface AvailabilityResponse {
  available: boolean;
  availableQuantity: number;
  conflicts: Array<{
    eventId: string;
    eventTitle: string;
    startTime: string;
    endTime: string;
    allocatedQuantity: number;
  }>;
  availabilityDetails: {
    totalQuantity: number;
    allocatedQuantity: number;
    remainingQuantity: number;
    maxConcurrentUsage?: number;
    currentConcurrentUsage: number;
    remainingConcurrentCapacity?: number;
  };
}

interface ResourceAvailabilityViewerProps {
  resourceId: string;
  resource: Resource;
  startTime: string;
  endTime: string;
  requestedQuantity?: number;
  excludeEventId?: string;
  onAvailabilityCheck?: (available: boolean, details: AvailabilityResponse) => void;
}

function ResourceAvailabilityViewer({
  resourceId,
  resource,
  startTime,
  endTime,
  requestedQuantity = 1,
  excludeEventId,
  onAvailabilityCheck,
}: ResourceAvailabilityViewerProps) {
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resourceId && startTime && endTime) {
      checkAvailability();
    }
  }, [resourceId, startTime, endTime, excludeEventId]);

  const checkAvailability = async () => {
    if (!startTime || !endTime) return;

    setLoading(true);
    setError(null);
    try {
      const params: any = {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      };
      if (excludeEventId) {
        params.excludeEventId = excludeEventId;
      }
      const response = await api.get(`/resources/${resourceId}/availability`, { params });
      setAvailability(response.data);
      if (onAvailabilityCheck) {
        onAvailabilityCheck(
          response.data.available && response.data.availableQuantity >= requestedQuantity,
          response.data,
        );
      }
    } catch (err: any) {
      console.error('Failed to check availability:', err);
      const errorMessage = err.response?.data?.message || 'Failed to check availability';
      setError(errorMessage);
      // Note: toast is not imported here, but error is shown in UI via setError
    } finally {
      setLoading(false);
    }
  };

  if (!startTime || !endTime) {
    return (
      <div style={{ padding: '1rem', background: 'var(--gray-200)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', margin: 0 }}>
          Select event start and end time to check resource availability
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '1rem', background: 'var(--gray-200)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gray-600)' }}>
          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
          <span style={{ fontSize: '0.875rem' }}>Checking availability...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', background: 'var(--red-50)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
        <p style={{ color: 'var(--red-700)', fontSize: '0.875rem', margin: 0 }}>⚠️ {error}</p>
      </div>
    );
  }

  if (!availability) {
    return null;
  }

  const canBookRequested = availability.available && availability.availableQuantity >= requestedQuantity;
  const isPartiallyAvailable = availability.available && availability.availableQuantity < requestedQuantity;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div
        style={{
          padding: '1rem',
          background: canBookRequested
            ? 'var(--green-50)'
            : isPartiallyAvailable
            ? 'var(--yellow-50)'
            : 'var(--red-50)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${
            canBookRequested ? 'var(--green-200)' : isPartiallyAvailable ? 'var(--yellow-200)' : 'var(--red-200)'
          }`,
        }}
      >
        {/* Availability Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {canBookRequested ? (
            <>
              <span style={{ fontSize: '1.25rem' }}>✓</span>
              <span style={{ fontWeight: 600, color: 'var(--green-700)' }}>Available</span>
            </>
          ) : isPartiallyAvailable ? (
            <>
              <span style={{ fontSize: '1.25rem' }}>⚠</span>
              <span style={{ fontWeight: 600, color: 'var(--yellow-700)' }}>Partially Available</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.25rem' }}>✗</span>
              <span style={{ fontWeight: 600, color: 'var(--red-700)' }}>Not Available</span>
            </>
          )}
        </div>

        {/* Availability Details */}
        <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 500 }}>Available:</span>{' '}
              <span style={{ fontWeight: 600, color: canBookRequested ? 'var(--green-700)' : 'var(--red-700)' }}>
                {availability.availableQuantity} {resource.type === 'consumable' ? 'units' : 'slots'}
              </span>
            </div>
            <div>
              <span style={{ fontWeight: 500 }}>Requested:</span>{' '}
              <span style={{ fontWeight: 600 }}>{requestedQuantity}</span>
            </div>
            <div>
              <span style={{ fontWeight: 500 }}>Total:</span>{' '}
              <span>{availability.availabilityDetails.totalQuantity}</span>
            </div>
            <div>
              <span style={{ fontWeight: 500 }}>Allocated:</span>{' '}
              <span>{availability.availabilityDetails.allocatedQuantity}</span>
            </div>
            {resource.type === 'shareable' && availability.availabilityDetails.maxConcurrentUsage && (
              <>
                <div>
                  <span style={{ fontWeight: 500 }}>Max Concurrent:</span>{' '}
                  <span>{availability.availabilityDetails.maxConcurrentUsage}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 500 }}>Current Usage:</span>{' '}
                  <span>{availability.availabilityDetails.currentConcurrentUsage}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Warning/Error Messages */}
        {isPartiallyAvailable && (
          <div style={{ padding: '0.5rem', background: 'var(--yellow-100)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--yellow-800)', margin: 0 }}>
              ⚠️ Only {availability.availableQuantity} {resource.type === 'consumable' ? 'units' : 'slots'} available. 
              Requested quantity ({requestedQuantity}) exceeds availability.
            </p>
          </div>
        )}

        {!canBookRequested && !isPartiallyAvailable && (
          <div style={{ padding: '0.5rem', background: 'var(--red-100)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--red-800)', margin: 0 }}>
              ✗ Resource is fully booked for this time period.
            </p>
          </div>
        )}

        {/* Conflicts */}
        {availability.conflicts.length > 0 && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-200)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--gray-700)' }}>
              Conflicting Events ({availability.conflicts.length}):
            </p>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {availability.conflicts.map((conflict, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.5rem',
                    background: 'var(--input-bg)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{conflict.eventTitle}</div>
                  <div style={{ color: 'var(--gray-600)', fontSize: '0.75rem' }}>
                    {new Date(conflict.startTime).toLocaleString()} - {new Date(conflict.endTime).toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--gray-600)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Allocated: {conflict.allocatedQuantity} {resource.type === 'consumable' ? 'units' : 'slots'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResourceAvailabilityViewer;
