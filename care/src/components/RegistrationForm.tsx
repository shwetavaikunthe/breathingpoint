import { useState, type FormEvent } from 'react';
import { supabase, messageOf } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { INDIAN_STATES, TYPE_LABEL, type Provider, type ProviderType } from '../lib/types';
import { Notice } from './Layout';

interface Props {
  type: ProviderType;
  /** new = create account + registration, complete = logged in but no registration yet, resubmit = fix a rejected registration */
  mode: 'new' | 'complete' | 'resubmit';
  existing?: Provider;
  onDone: () => void;
}

const MAX_FILE = 5 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

export function RegistrationForm({ type, mode, existing, onDone }: Props) {
  const { user } = useAuth();
  const [f, setF] = useState({
    fullName: existing?.full_name ?? '',
    mobile: existing ? existing.mobile.replace('+91', '') : '',
    email: existing?.email ?? user?.email ?? '',
    password: '',
    confirm: '',
    address: existing?.address ?? '',
    city: existing?.city ?? '',
    state: existing?.state ?? '',
    pincode: existing?.pincode ?? '',
    certificateNo: existing?.certificate_no ?? '',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    existing?.latitude != null && existing?.longitude != null ? { lat: existing.latitude, lng: existing.longitude } : null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const isYoga = type === 'yoga_teacher';
  const placeLabel = isYoga ? 'Address of your yoga classes' : 'Clinic address';

  function validate(): string | null {
    if (f.fullName.trim().length < 2) return 'Please enter your full name.';
    if (!/^[6-9]\d{9}$/.test(f.mobile.trim())) return 'Enter a valid 10-digit Indian mobile number (WhatsApp number preferred).';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return 'Enter a valid email address.';
    if (mode === 'new') {
      if (f.password.length < 8) return 'Password must be at least 8 characters.';
      if (f.password !== f.confirm) return 'The two passwords do not match.';
    }
    if (f.address.trim().length < 5) return `Please enter the ${placeLabel.toLowerCase()}.`;
    if (!f.city.trim()) return 'Please enter your city.';
    if (!f.state) return 'Please select your state.';
    if (!/^\d{6}$/.test(f.pincode.trim())) return 'Enter a valid 6-digit pincode.';
    if (f.certificateNo.trim().length < 3) return 'Please enter your certificate / registration number.';
    if (!file && mode !== 'resubmit') return 'Please upload your certificate (PDF, JPG or PNG).';
    if (file) {
      if (!ALLOWED.includes(file.type)) return 'Certificate must be a PDF, JPG or PNG file.';
      if (file.size > MAX_FILE) return 'Certificate file must be smaller than 5 MB.';
    }
    return null;
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError('Your browser cannot share location. You can continue without it.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setError(null);
      },
      () => setError('Location permission was denied. You can continue without it.'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      let uid = user?.id;
      if (mode === 'new') {
        const { data, error: signErr } = await supabase.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: { data: { full_name: f.fullName.trim() } },
        });
        if (signErr) throw signErr;
        if (!data.session || !data.user) {
          setNotice(
            'Account created. Please confirm your email address using the link we just sent, then log in. You will be asked to finish your registration (certificate upload) right after you log in.',
          );
          return;
        }
        uid = data.user.id;
      }
      if (!uid) throw new Error('Please log in again.');

      let certificatePath = existing?.certificate_path ?? '';
      if (file) {
        const safe = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80);
        certificatePath = `${uid}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from('certificates').upload(certificatePath, file, { contentType: file.type });
        if (upErr) throw upErr;
      }

      const fields = {
        full_name: f.fullName.trim(),
        mobile: `+91${f.mobile.trim()}`,
        email: f.email.trim(),
        address: f.address.trim(),
        city: f.city.trim(),
        state: f.state,
        pincode: f.pincode.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        certificate_no: f.certificateNo.trim(),
        certificate_path: certificatePath,
      };

      if (mode === 'resubmit' && existing) {
        const { error: updErr } = await supabase.from('providers').update({ ...fields, status: 'pending' }).eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('providers').insert({ user_id: uid, provider_type: type, ...fields });
        if (insErr) throw insErr;
      }
      onDone();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (notice) return <Notice kind="ok">{notice}</Notice>;

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>
        {mode === 'resubmit' ? 'Update and resubmit your registration' : `Register as a ${TYPE_LABEL[type]}`}
      </h2>

      <label>
        Full name
        <input value={f.fullName} onChange={set('fullName')} autoComplete="name" disabled={existing?.status === 'approved'} />
      </label>

      <div className="row">
        <label>
          Mobile number (WhatsApp)
          <div className="prefix">
            <span>+91</span>
            <input value={f.mobile} onChange={set('mobile')} inputMode="numeric" maxLength={10} autoComplete="tel-national" />
          </div>
        </label>
        <label>
          Email ID
          <input type="email" value={f.email} onChange={set('email')} autoComplete="email" />
        </label>
      </div>

      {mode === 'new' && (
        <div className="row">
          <label>
            Password (min 8 characters)
            <input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
          </label>
          <label>
            Confirm password
            <input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </label>
        </div>
      )}

      <label>
        {placeLabel}
        <textarea rows={2} value={f.address} onChange={set('address')} />
      </label>

      <div className="row three">
        <label>
          City
          <input value={f.city} onChange={set('city')} autoComplete="address-level2" />
        </label>
        <label>
          State
          <select value={f.state} onChange={set('state')}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Pincode
          <input value={f.pincode} onChange={set('pincode')} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
        </label>
      </div>

      <div className="locrow">
        <button type="button" className="btn btn-ghost" onClick={captureLocation}>
          Use my current location (optional)
        </button>
        {coords && <span className="muted">Location captured. It will help patients within 6 km find you. Do this while you are at your class or clinic.</span>}
      </div>

      <label>
        {isYoga ? 'Yoga certificate number (e.g. Ishwari Yoga Institute / YCB)' : 'Physiotherapy registration / certificate number'}
        <input value={f.certificateNo} onChange={set('certificateNo')} />
      </label>

      <label>
        {isYoga ? 'Upload yoga certificate' : 'Upload physiotherapy certificate'} (PDF, JPG or PNG, max 5 MB)
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {mode === 'resubmit' && <span className="muted">Leave empty to keep the certificate you uploaded before.</span>}
      </label>

      {error && <Notice kind="error">{error}</Notice>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'resubmit' ? 'Resubmit for review' : 'Submit registration'}
      </button>
      <p className="muted small">Your certificate is stored privately and is visible only to you and the Breathing Point review team.</p>
    </form>
  );
}
