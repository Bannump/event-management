import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../App.css';

interface Organization {
  id: string;
  name: string;
  emailTemplate?: string | null;
  createdAt: string;
}

function OrganizationsList() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', emailTemplate: '' });
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]); // Store all orgs from API
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/organizations');
      let orgs = response.data || [];
      
      // If org admin, filter to show only their organization
      if (!isAdmin && user?.organizationId) {
        orgs = orgs.filter((org: Organization) => org.id === user.organizationId);
      }
      
      setAllOrganizations(orgs);
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
      toast.error(error.response?.data?.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering with useMemo for performance
  const organizations = useMemo(() => {
    if (!searchTerm.trim()) {
      return allOrganizations;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    return allOrganizations.filter((org: Organization) => 
      org.name?.toLowerCase().includes(searchLower)
    );
  }, [allOrganizations, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgData: any = { name: formData.name };
      if (formData.emailTemplate) {
        orgData.emailTemplate = formData.emailTemplate;
      }

      if (editingOrg) {
        await api.patch(`/organizations/${editingOrg.id}`, orgData);
        toast.success('Organization updated successfully!');
      } else {
        await api.post('/organizations', orgData);
        toast.success('Organization created successfully!');
      }
      setFormData({ name: '', emailTemplate: '' });
      setShowForm(false);
      setEditingOrg(null);
      loadOrganizations();
    } catch (error: any) {
      console.error('Failed to save organization:', error);
      toast.error(error.response?.data?.message || 'Failed to save organization');
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ name: org.name, emailTemplate: org.emailTemplate || '' });
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrg(null);
    setFormData({ name: '', emailTemplate: '' });
  };

  const deleteOrganization = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization?')) return;
    try {
      await api.delete(`/organizations/${id}`);
      loadOrganizations();
      toast.success('Organization deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete organization:', error);
      toast.error(error.response?.data?.message || 'Failed to delete organization');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">{isAdmin ? 'Organizations' : 'My Organization'}</h1>
        <div className="card-actions">
          {isAdmin && (
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
              {showForm ? 'Cancel' : '+ Create Organization'}
            </button>
          )}
          {!isAdmin && organizations.length > 0 && (
            <button onClick={() => handleEdit(organizations[0])} className="btn btn-primary">
              Edit Organization
            </button>
          )}
        </div>
      </div>

      {(showForm || editingOrg) && (
        <div style={{ padding: '1.5rem', background: 'var(--gray-200)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gray-900)' }}>{editingOrg ? 'Edit Organization' : 'Create New Organization'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Organization Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., ABC Corporation"
              />
            </div>
            <div className="form-group">
              <label>Email Template (Optional)</label>
              <input
                type="text"
                value={formData.emailTemplate}
                onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                placeholder="@abc.in or *@abc.in"
              />
              <small style={{ display: 'block', marginTop: '0.25rem', color: '#718096' }}>
                Users must have emails matching this template. Examples: @abc.in, *@abc.in
              </small>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingOrg ? 'Update' : 'Create'} Organization
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Input (Admin only) */}
      {isAdmin && (
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
              placeholder="Search organizations by name..."
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
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email Template</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>
                  No organizations found. Create one!
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id}>
                  <td style={{ fontWeight: 600 }}>{org.name}</td>
                  <td>
                    {org.emailTemplate ? (
                      <code style={{ background: 'var(--gray-100)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                        *{org.emailTemplate}
                      </code>
                    ) : (
                      <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No template</span>
                    )}
                  </td>
                  <td>{new Date(org.createdAt).toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* Admins can edit all orgs, org admins can only edit their own org */}
                      {(isAdmin || (!isAdmin && org.id === user?.organizationId)) && (
                        <button
                          onClick={() => handleEdit(org)}
                          className="btn btn-sm btn-secondary"
                        >
                          Edit
                        </button>
                      )}
                      {/* Only admins can delete organizations */}
                      {isAdmin && (
                        <button
                          onClick={() => deleteOrganization(org.id)}
                          className="btn btn-sm btn-danger"
                        >
                          Delete
                        </button>
                      )}
                    </div>
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

export default OrganizationsList;
