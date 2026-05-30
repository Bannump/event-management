import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../App.css';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  organization?: {
    id: string;
    name: string;
  };
}

interface Organization {
  id: string;
  name: string;
  emailTemplate?: string | null;
}

function UsersList() {
  const { user, isAdmin, isOrg } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user',
    organizationId: isOrg ? (user?.organizationId || '') : '',
  });
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Store all users from API
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterOrg, setFilterOrg] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, orgsRes] = await Promise.all([
        api.get('/users'),
        api.get('/organizations'),
      ]);
      setAllUsers(usersRes.data || []);
      setOrganizations(orgsRes.data || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast.error(error.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering with useMemo for performance
  const users = useMemo(() => {
    let filtered = [...allUsers];
    
    // Apply search filter (instant, no API call)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((u: User) => 
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter((u: User) => u.role === filterRole);
    }
    
    // Apply organization filter
    if (filterOrg !== 'all') {
      if (filterOrg === 'independent') {
        filtered = filtered.filter((u: User) => !u.organizationId);
      } else {
        filtered = filtered.filter((u: User) => u.organizationId === filterOrg);
      }
    }
    
    return filtered;
  }, [allUsers, searchTerm, filterRole, filterOrg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingUser && formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      const userData: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      };

      // Only include password if creating new user or if password is provided during edit
      if (!editingUser || formData.password) {
        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters long');
          return;
        }
        userData.password = formData.password;
      }

      // Org admin requires organization
      if (formData.role === 'org' && !formData.organizationId) {
        toast.error('Organization admin must belong to an organization');
        return;
      }

      // For org admins, force their organization
      if (isOrg && user?.organizationId) {
        userData.organizationId = user.organizationId;
      } else if (formData.organizationId) {
        // Only include organizationId if provided (for independent users, leave it out)
        userData.organizationId = formData.organizationId;
      }

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, userData);
        toast.success('User updated successfully!');
      } else {
        await api.post('/users', userData);
        toast.success('User created successfully!');
      }
      
      const resetOrgId = isOrg ? (user?.organizationId || '') : '';
      setFormData({ email: '', name: '', password: '', role: 'user', organizationId: resetOrgId });
      setShowForm(false);
      setEditingUser(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      name: userToEdit.name,
      password: '',
      role: userToEdit.role,
      organizationId: userToEdit.organizationId || '',
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    const resetOrgId = isOrg ? (user?.organizationId || '') : '';
    setFormData({ email: '', name: '', password: '', role: 'user', organizationId: resetOrgId });
    setShowForm(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      loadData();
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (filterOrg === 'independent' && user.organizationId !== null) return false;
    if (filterOrg !== 'all' && filterOrg !== 'independent' && user.organizationId !== filterOrg) return false;
    return true;
  });

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">Users Management</h1>
        <button onClick={() => showForm ? handleCancelEdit() : setShowForm(true)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1.5rem', background: 'var(--gray-200)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--gray-900)' }}>{editingUser ? 'Edit User' : 'Create New User'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="User Name"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password {editingUser ? '(leave empty to keep unchanged)' : '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  placeholder="••••••••"
                  minLength={6}
                />
                <small>{editingUser ? 'Leave empty to keep current password' : 'Must be at least 6 characters'}</small>
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="user">User</option>
                  {isAdmin && (
                    <>
                      <option value="org">Organization Admin</option>
                      <option value="admin">System Admin</option>
                    </>
                  )}
                </select>
                <small>
                  {isAdmin 
                    ? 'Only admins can create org admins'
                    : 'You can only create regular users'}
                </small>
              </div>
            </div>
            <div className="form-group">
              <label>Organization</label>
              <select
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                required={formData.role === 'org'}
                disabled={isOrg}
              >
                {!isOrg && <option value="">Independent User</option>}
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                    {org.emailTemplate && ` (Email: *${org.emailTemplate})`}
                  </option>
                ))}
              </select>
              <small>
                {isOrg 
                  ? 'As an org admin, you can only create users for your organization'
                  : formData.organizationId && organizations.find(o => o.id === formData.organizationId)?.emailTemplate
                  ? `User email must match: username${organizations.find(o => o.id === formData.organizationId)?.emailTemplate}`
                  : formData.role === 'org' 
                    ? 'Organization admin must belong to an organization'
                    : 'Leave empty for independent user'}
              </small>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              <button type="button" onClick={handleCancelEdit} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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
            placeholder="Search users by name or email..."
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

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Filter by Role</label>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="org">Org Admin</option>
            <option value="user">User</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Filter by Organization</label>
          <select value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)}>
            <option value="all">All Organizations</option>
            <option value="independent">Independent Users</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organization</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>
                  No users found. Create a user!
                </td>
              </tr>
            ) : (
              filteredUsers.map((userItem) => (
                <tr key={userItem.id}>
                  <td>
                    <code style={{ 
                      fontSize: '0.85rem', 
                      background: 'var(--gray-200)', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}>
                      {userItem.id.substring(0, 8)}...
                    </code>
                  </td>
                  <td>{userItem.name}</td>
                  <td>{userItem.email}</td>
                  <td>
                    <span className={`badge badge-${
                      userItem.role === 'admin' ? 'danger' :
                      userItem.role === 'org' ? 'warning' :
                      'info'
                    }`}>
                      {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                    </span>
                  </td>
                  <td>
                    {userItem.organizationId 
                      ? (userItem.organization?.name || organizations.find(o => o.id === userItem.organizationId)?.name || 'Unknown')
                      : <span className="badge badge-info">Independent</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* Admins can edit all users, org admins can edit users in their org */}
                      {(isAdmin || (isOrg && userItem.organizationId === user?.organizationId)) && (
                        <button
                          onClick={() => handleEdit(userItem)}
                          className="btn btn-sm btn-secondary"
                        >
                          Edit
                        </button>
                      )}
                      {/* Admins can delete all users, org admins can delete users in their org */}
                      {(isAdmin || (isOrg && userItem.organizationId === user?.organizationId)) && (
                        <button
                          onClick={() => deleteUser(userItem.id)}
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

export default UsersList;
