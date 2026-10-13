import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, messageOf } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { TYPE_LABEL, type Provider, type ProviderStatus } from '../lib/types';
import { formatDateTime } from '../lib/time';
import { Notice } from '../components/Layout';

const TABS: { key: ProviderStatus; label: string }[] = [
  { key: 'pending', label: 'To review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export function AdminDashboard() {
  const { user, adminScope, loading } = useAuth();
  const [rows, setRows] = useState<Provider[] | null>(null);
  const [tab, setTab] = useState<ProviderStatus>('pending');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('providers').select('*').order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setRows((data ?? []) as Provider[]);
  }, []);

  useEffect(() => {
    if (adminScope) load();
  }, [adminScope, load]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/admin" replace />;
  if (!adminScope) return <Navigate to="/dashboard" replace />;

  const shown = (rows ?? []).filter((r) => r.status === tab);
  const count = (s: ProviderStatus) => (rows ?? []).filter((r) => r.status === s).length;

  return (
    <div className="stack">
      <section className="card">
        <h2>{adminScope === 'yoga' ? 'Yoga teacher registrations' : 'Physiotherapist registrations'}</h2>
        <p className="muted">Review each certificate, then approve, or reject with a clear reason so the applicant knows what to fix.</p>
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`chip ${tab === t.key ? 'chip-on' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} ({count(t.key)})
            </button>
          ))}
        </div>
      </section>

      {error && <Notice kind="error">{error}</Notice>}
      {rows && shown.length === 0 && <p className="muted center">Nothing here.</p>}
      {shown.map((p) => (
        <ReviewCard key={p.id} p={p} onDone={load} />
      ))}
    </div>
  );
}

function ReviewCard({ p, onDone }: { p: Provider; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function viewCertificate() {
    const w = window.open('', '_blank'); // opened first so mobile browsers do not block it
    const { data, error: err } = await supabase.storage.from('certificates').createSignedUrl(p.certificate_path, 300);
    if (err || !data?.signedUrl) {
      w?.close();
      setError(err?.message ?? 'Could not open the certificate.');
      return;
    }
    if (w) w.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  }

  async function decide(decision: 'approve' | 'reject') {
    setError(null);
    if (decision === 'reject' && reason.trim().length < 10) {
      setError('Please write a clear reason (at least 10 characters) so the applicant can fix the registration.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.rpc('review_provider', {
      p_provider_id: p.id,
      p_decision: decision,
      p_reason: decision === 'reject' ? reason.trim() : null,
    });
    setBusy(false);
    if (err) setError(messageOf(err));
    else onDone();
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>{p.full_name}</h3>
          <p className="muted">{TYPE_LABEL[p.provider_type]} · applied {formatDateTime(p.created_at)}</p>
        </div>
        <span className={`badge badge-${p.status}`}>{p.status}</span>
      </div>

      <dl className="details">
        <dt>Mobile</dt><dd><a href={`tel:${p.mobile}`}>{p.mobile}</a></dd>
        <dt>Email</dt><dd><a href={`mailto:${p.email}`}>{p.email}</a></dd>
        <dt>Address</dt><dd>{p.address}</dd>
        <dt>City / State</dt><dd>{p.city}, {p.state} {p.pincode}</dd>
        <dt>Certificate no.</dt><dd>{p.certificate_no}</dd>
        {p.latitude != null && p.longitude != null && (
          <>
            <dt>Location</dt>
            <dd><a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer">View on map</a></dd>
          </>
        )}
      </dl>

      {p.status === 'pending' && p.reject_reason && (
        <Notice kind="info"><strong>Resubmitted.</strong> Earlier rejection reason: {p.reject_reason}</Notice>
      )}
      {p.status === 'rejected' && <Notice kind="error"><strong>Rejected</strong> {p.reviewed_at ? `on ${formatDateTime(p.reviewed_at)}` : ''}: {p.reject_reason}</Notice>}

      <div className="actions">
        <button className="btn btn-ghost" onClick={viewCertificate}>View certificate</button>
        {p.status === 'pending' && !rejecting && (
          <>
            <button className="btn btn-primary" disabled={busy} onClick={() => decide('approve')}>Approve</button>
            <button className="btn btn-danger" disabled={busy} onClick={() => setRejecting(true)}>Reject…</button>
          </>
        )}
      </div>

      {rejecting && (
        <div className="reject-box">
          <label>
            Reason for rejection (shown to the applicant)
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The certificate image is blurred. Please upload a clear scan." />
          </label>
          <div className="actions">
            <button className="btn btn-danger" disabled={busy} onClick={() => decide('reject')}>Confirm rejection</button>
            <button className="btn btn-ghost" onClick={() => { setRejecting(false); setReason(''); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}
      {error && <Notice kind="error">{error}</Notice>}
    </section>
  );
}
