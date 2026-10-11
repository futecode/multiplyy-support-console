import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { RealtimeProvider } from './realtime/RealtimeContext';
import { LoginPage } from './pages/LoginPage';
import { APP_ROUTES } from './routes';

function AuthedShell() {
  const { token } = useAuth();
  return (
    <RequireAuth>
      {token && (
        <RealtimeProvider token={token}>
          <Layout />
        </RealtimeProvider>
      )}
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthedShell />}>
          {APP_ROUTES.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
