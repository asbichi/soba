import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { ResultEntry } from './pages/ResultEntry';
import { Verification } from './pages/Verification';

import { Admin } from './pages/Admin';

import { Reports } from './pages/Reports';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string[] }) {
  const { user, dbUser, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (requiredRole && dbUser && !requiredRole.includes(dbUser.role)) {
    return <div className="p-8 text-center text-red-600">Unauthorized. You do not have permission to view this page.</div>;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="results/entry" element={
              <ProtectedRoute requiredRole={['POLLING_UNIT_OFFICER', 'SUPER_ADMIN']}>
                <ResultEntry />
              </ProtectedRoute>
            } />
            <Route path="results/verify" element={
              <ProtectedRoute requiredRole={['COLLATION_OFFICER', 'SUPER_ADMIN']}>
                <Verification />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN', 'COLLATION_OFFICER', 'VIEWER']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
                <Admin />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
