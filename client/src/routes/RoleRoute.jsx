import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/common/Loader';

const AccountTypeRoute = ({ allowedAccountTypes, allowedRoles }) => {
  const { user, accountType, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-950)' }}>
        <Loader text="Verifying permissions..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentType = accountType || role;
  const normalizedType = (currentType === 'donor' || currentType === 'recipient' || currentType === 'individual') ? 'user' : currentType;
  const allowed = allowedAccountTypes || allowedRoles || [];

  const isAllowed = allowed.some(a => a === normalizedType || a === currentType);

  if (allowed.length > 0 && !isAllowed) {
    switch (normalizedType) {
      case 'user':
      case 'individual':
        return <Navigate to="/donor/dashboard" replace />;
      case 'hospital':
        return <Navigate to="/hospital/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default AccountTypeRoute;
export { AccountTypeRoute };
