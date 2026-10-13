import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { TYPE_LABEL, type Provider, type ProviderType } from '../lib/types';
import { formatDateTime } from '../lib/time';
import { RegistrationForm } from '../components/RegistrationForm';
import { ScheduleManager } from '../components/ScheduleManager';
import { Notice } from '../components/Layout';

export function Dashboard() {
  const { user, adminScope, loading } = useAuth();
  const [provider, setProvider] = useState<Provider | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<ProviderType | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase.from('providers').select('*').eq('user_id', user.id).maybeSingle();
    if (err) setError(err.message);
    else setProvider((data as Provider | null) ?? null);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminScope) return <Navigate to="/admin/dashboard" replace />;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (provider === undefined) return <p className="muted">Loading…</p>;

  // logged in but registration was never completed
  if (provider === null) {
    return (
      <div className="stack narrow-page">
        <section className="card">
          <h2>Complete your registration</h2>
          <p>I am registering as a:</p>
          <div className="actions">
            <button className={`chip ${chosen === 'yoga_teacher' ? 'chip-on' : ''}`} onClick={() => setChosen('yoga_teacher')}>Yoga Teacher</button>
            <button className={`chip ${chosen === 'physiotherapist' ? 'chip-on' : ''}`} onClick={() => setChosen('physiotherapist')}>Physiotherapist</button>
          </div>
        </section>
        {chosen && <RegistrationForm key={chosen} type={chosen} mode="complete" onDone={load} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <div>
            <h2>{provider.full_name}</h2>
            <p className="muted">{TYPE_LABEL[provider.provider_type]} · {provider.city}, {provider.state}</p>
          </div>
          <span className={`badge badge-${provider.status}`}>
            {provider.status === 'pending' ? 'Under review' : provider.status === 'approved' ? 'Approved' : 'Needs changes'}
          </span>
        </div>

        {provider.status === 'pending' && (
          <Notice kind="info">
            Thank you. Your registration is waiting for review by the Breathing Point team. You will be able to publish your timings and fees as soon as it is approved. Log in again to check the status.
          </Notice>
        )}
        {provider.status === 'approved' && (
          <Notice kind="ok">Your registration is approved{provider.reviewed_at ? ` (${formatDateTime(provider.reviewed_at)})` : ''}. Publish your timings below.</Notice>
        )}
        {provider.status === 'rejected' && (
          <div className="alert alert-error">
            <strong>Your registration needs changes.</strong>
            <p className="reason">{provider.reject_reason}</p>
            <p className="small">Please update the details below and resubmit.</p>
          </div>
        )}
      </section>

      {provider.status === 'rejected' && (
        <RegistrationForm type={provider.provider_type} mode="resubmit" existing={provider} onDone={load} />
      )}
      {provider.status === 'approved' && <ScheduleManager provider={provider} />}
    </div>
  );
}
