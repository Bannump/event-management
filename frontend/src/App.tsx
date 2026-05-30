import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import EventsList from './components/EventsList';
import EventForm from './components/EventForm';
import ResourcesList from './components/ResourcesList';
import ResourceAllocation from './components/ResourceAllocation';
import ReportsDashboard from './components/ReportsDashboard';
import InvitesManagement from './components/InvitesManagement';
import MyInvites from './components/MyInvites';
import UsersList from './components/UsersList';
import OrganizationsList from './components/OrganizationsList';
import AttendeesList from './components/AttendeesList';
import MyAttendance from './components/MyAttendance';
import PublicInviteResponse from './components/PublicInviteResponse';
import { OrganizationContext } from './contexts/OrganizationContext';
import './App.css';

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/events/new') return 'Create Event';
  if (/^\/events\/[^/]+\/edit$/.test(pathname)) return 'Edit Event';
  if (pathname.startsWith('/events') && pathname.includes('/attendees')) return 'Attendees';
  if (pathname.startsWith('/events')) return 'Events';
  if (pathname === '/resources') return 'Resources';
  if (pathname === '/allocations') return 'Resource Allocations';
  if (pathname === '/users') return 'Users';
  if (pathname === '/organizations') return 'Organizations';
  if (pathname === '/invites') return 'Invite Management';
  if (pathname === '/my-invites') return 'My Invitations';
  if (pathname === '/my-attendance') return 'My Attendance';
  if (pathname === '/reports') return 'Reports & Analytics';
  return 'EventBook';
}

function AppContent() {
  const { user } = useAuth();

  return (
    <OrganizationContext.Provider value={{
      selectedOrgId: user?.organizationId || null,
      setSelectedOrgId: () => {},
    }}>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute><AppLayout><EventsList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/events/new" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><EventForm /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/events/:id/edit" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><EventForm /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/resources" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><ResourcesList /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/allocations" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><ResourceAllocation /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><UsersList /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/organizations" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><OrganizationsList /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/events/:eventId/attendees" element={
              <ProtectedRoute><AppLayout><AttendeesList /></AppLayout></ProtectedRoute>
            } />
            <Route path="/my-attendance" element={
              <ProtectedRoute allowedRoles={['user']}>
                <AppLayout><MyAttendance /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/invites" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><InvitesManagement /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/my-invites" element={
              <ProtectedRoute><AppLayout><MyInvites /></AppLayout></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['admin', 'org']}>
                <AppLayout><ReportsDashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/invites/:token" element={<PublicInviteResponse />} />
          </Routes>
        </div>
      </Router>
    </OrganizationContext.Provider>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin, isOrg } = useAuth();
  const location = useLocation();
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const sidebarOpen = isPinned || isHovered;

  const handleNavClick = () => {
    if (!isPinned) setIsHovered(false);
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className={`app-container ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { if (!isPinned) setIsHovered(false); }}
      >
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo" onClick={handleNavClick}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
            </svg>
            <span>EventBook</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main</div>
            <Link
              to="/dashboard"
              className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
              onClick={handleNavClick}
              data-label="Dashboard"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link
              to="/events"
              className={`nav-item ${isActive('/events') ? 'active' : ''}`}
              onClick={handleNavClick}
              data-label="Events"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Events</span>
            </Link>

            {!isAdmin && !isOrg && (
              <Link
                to="/my-attendance"
                className={`nav-item ${isActive('/my-attendance') ? 'active' : ''}`}
                onClick={handleNavClick}
                data-label="My Attendance"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>My Attendance</span>
              </Link>
            )}

            <Link
              to="/my-invites"
              className={`nav-item ${isActive('/my-invites') ? 'active' : ''}`}
              onClick={handleNavClick}
              data-label="My Invitations"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>My Invitations</span>
            </Link>
          </div>

          {(isAdmin || isOrg) && (
            <div className="nav-section">
              <div className="nav-section-title">Management</div>

              <Link
                to="/users"
                className={`nav-item ${isActive('/users') ? 'active' : ''}`}
                onClick={handleNavClick}
                data-label="Users"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
                <span>Users</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/organizations"
                  className={`nav-item ${isActive('/organizations') ? 'active' : ''}`}
                  onClick={handleNavClick}
                  data-label="Organizations"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  <span>Organizations</span>
                </Link>
              )}

              <Link
                to="/resources"
                className={`nav-item ${isActive('/resources') ? 'active' : ''}`}
                onClick={handleNavClick}
                data-label="Resources"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <span>Resources</span>
              </Link>

              <Link
                to="/allocations"
                className={`nav-item ${isActive('/allocations') ? 'active' : ''}`}
                onClick={handleNavClick}
                data-label="Allocations"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <span>Allocations</span>
              </Link>

              <Link
                to="/invites"
                className={`nav-item ${isActive('/invites') ? 'active' : ''}`}
                onClick={handleNavClick}
                data-label="Invites"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>Invites</span>
              </Link>

              <Link
                to="/reports"
                className={`nav-item ${isActive('/reports') ? 'active' : ''}`}
                onClick={handleNavClick}
                data-label="Reports"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span>Reports</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">
                {user?.role === 'admin'
                  ? 'Administrator'
                  : user?.role === 'org'
                  ? 'Org Admin'
                  : 'Member'}
              </div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-secondary btn-block btn-sm">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="topbar-hamburger"
              onClick={() => setIsPinned(!isPinned)}
              aria-label={isPinned ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="topbar-title">{pageTitle}</span>
          </div>

          <div className="topbar-right">
            {user?.organization && (
              <span className="topbar-org-badge">{user.organization.name}</span>
            )}
            <span
              className={`badge topbar-role-badge ${
                user?.role === 'admin'
                  ? 'badge-danger'
                  : user?.role === 'org'
                  ? 'badge-warning'
                  : 'badge-primary'
              }`}
            >
              {user?.role === 'admin' ? 'Admin' : user?.role === 'org' ? 'Org' : 'Member'}
            </span>
            <div className="topbar-user-avatar" title={user?.name}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="content-wrapper">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
