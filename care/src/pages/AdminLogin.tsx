import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Notice } from '../components/Layout';

/** Admins sign in with a short username (yoga_admin / phy_admin). It maps to an email-style login in Supabase. */
const ADMIN_DOMAIN = 'admin.breathingpoint.in';

export function AdminLogin() {
  const navigate = useNavigate();
  const { adminScope, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && adminScope) return <Navigate to="/admin/dashboard" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: `${username.trim().toLowerCase()}@${ADMIN_DOMAIN}`,
      password,
    });
    if (err || !data.user) {
      setBusy(false);
      setError('Username or password is not correct.');
      return;
    }
    const { data: row } = await supabase.from('admins').select('scope').eq('user_id', data.user.id).maybeSingle();
    setBusy(false);
    if (!row) {
      await supabase.auth.signOut();
      setError('This account is not an administrator.');
      return;
    }
    navigate('/admin/dashboard');
  }

  return (
    <form className="card form narrow-page" onSubmit={submit}>
      <h2>Admin log in</h2>
      <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {error && <Notice kind="error">{error}</Notice>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
    </form>
  );
}
