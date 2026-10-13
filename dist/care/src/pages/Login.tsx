import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase, messageOf } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Notice } from '../components/Layout';

export function Login() {
  const navigate = useNavigate();
  const { user, adminScope, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!loading && user) return <Navigate to={adminScope ? '/admin/dashboard' : '/dashboard'} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message === 'Invalid login credentials' ? 'Email or password is not correct.' : err.message);
    else navigate('/dashboard');
  }

  async function forgot() {
    if (!email.trim()) return setError('Type your email address above first, then press "Forgot password".');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/care/` });
    if (err) setError(messageOf(err));
    else {
      setError(null);
      setResetSent(true);
    }
  }

  return (
    <form className="card form narrow-page" onSubmit={submit}>
      <h2>Log in</h2>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {error && <Notice kind="error">{error}</Notice>}
      {resetSent && <Notice kind="ok">If that email is registered, a password reset link is on its way.</Notice>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
      <button type="button" className="linklike" onClick={forgot}>Forgot password?</button>
      <p className="muted small">
        New here? <Link to="/yoga">Register as a yoga teacher</Link> or <Link to="/physio">as a physiotherapist</Link>.
      </p>
    </form>
  );
}
