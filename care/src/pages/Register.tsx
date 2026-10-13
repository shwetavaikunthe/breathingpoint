import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { RegistrationForm } from '../components/RegistrationForm';
import { typeFromSlug } from '../lib/types';
import { useAuth } from '../lib/auth';

export function Register() {
  const { slug } = useParams();
  const type = typeFromSlug(slug);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (!type) return <Navigate to="/" replace />;
  if (loading) return <p className="muted">Loading…</p>;
  // already has an account: go to the dashboard (it will ask to complete registration if needed)
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="narrow-page">
      <RegistrationForm type={type} mode="new" onDone={() => navigate('/dashboard')} />
    </div>
  );
}
