import { useState } from 'react';
import { supabase, messageOf } from '../lib/supabase';
import { WEEKDAYS, type Offering, type OfferingKind } from '../lib/types';
import { hhmm, toMinutes } from '../lib/time';
import { Notice } from './Layout';

interface Win {
  weekday: number;
  start: string;
  end: string;
}

interface Props {
  kind: Extract<OfferingKind, 'physio_clinic' | 'physio_home' | 'yoga_home'>;
  title: string;
  help: string;
  /** slot length is fixed for home visits (45 or 60 min); null = provider chooses (clinic sessions) */
  fixedSlot: number | null;
  /** 'session' = rate per session only, 'either' = per session and/or per month */
  rates: 'session' | 'either';
  offering?: Offering;
  onSaved: () => void;
}

const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));

export function OfferingEditor({ kind, title, help, fixedSlot, rates, offering, onSaved }: Props) {
  const [slot, setSlot] = useState<number>(fixedSlot ?? offering?.slot_minutes ?? 45);
  const [rateSession, setRateSession] = useState(offering?.rate_per_session?.toString() ?? '');
  const [rateMonth, setRateMonth] = useState(offering?.rate_per_month?.toString() ?? '');
  const [wins, setWins] = useState<Win[]>(
    offering && offering.availability.length
      ? [...offering.availability]
          .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start_time.localeCompare(b.start_time))
          .map((a) => ({ weekday: a.weekday, start: hhmm(a.start_time), end: hhmm(a.end_time) }))
      : [{ weekday: 1, start: '', end: '' }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setWin = (i: number, patch: Partial<Win>) => {
    setSaved(false);
    setWins(wins.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  };

  const slotsIn = (w: Win) => (w.start && w.end && w.end > w.start ? Math.floor((toMinutes(w.end) - toMinutes(w.start)) / slot) : 0);

  function validate(): string | null {
    if (!Number.isInteger(slot) || slot < 15 || slot > 120) return 'Session length must be between 15 and 120 minutes.';
    const rs = num(rateSession);
    const rm = num(rateMonth);
    if (rates === 'session' && (rs === null || !(rs >= 0))) return 'Enter your rate per session.';
    if (rates === 'either') {
      if (rs === null && rm === null) return 'Enter a rate per session, per month, or both.';
      if ((rs !== null && !(rs >= 0)) || (rm !== null && !(rm >= 0))) return 'Rates must be valid amounts.';
    }
    for (const w of wins) {
      if (!w.start || !w.end) return 'Fill in the start and end time for every row, or remove the row.';
      if (w.end <= w.start) return 'End time must be after start time.';
      const mins = toMinutes(w.end) - toMinutes(w.start);
      if (mins % slot !== 0) return `Each time window must be a whole number of ${slot}-minute slots (for example ${slot * 2} minutes).`;
    }
    const sorted = [...wins].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].weekday === sorted[i - 1].weekday && sorted[i].start < sorted[i - 1].end) return 'Two of your time windows overlap.';
    }
    return null;
  }

  async function save() {
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.rpc('save_offering', {
        p_offering_id: offering?.id ?? null,
        p_kind: kind,
        p_label: null,
        p_slot_minutes: slot,
        p_rate_session: num(rateSession),
        p_rate_month: rates === 'either' ? num(rateMonth) : null,
        p_windows: wins,
      });
      if (err) throw err;
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!offering || !window.confirm('Remove this listing and all its timings?')) return;
    setBusy(true);
    const { error: err } = await supabase.from('offerings').delete().eq('id', offering.id);
    setBusy(false);
    if (err) setError(err.message);
    else onSaved();
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
        {offering && <span className="badge badge-ok">Published</span>}
      </div>
      <p className="muted">{help}</p>

      {fixedSlot === null && (
        <label className="inline">
          Session length (minutes)
          <input type="number" min={15} max={120} step={5} value={slot} onChange={(e) => setSlot(Number(e.target.value))} className="narrow" />
        </label>
      )}

      <div className="row">
        <label>
          Rate per session (₹)
          <input type="number" min={0} inputMode="decimal" value={rateSession} onChange={(e) => { setSaved(false); setRateSession(e.target.value); }} />
        </label>
        {rates === 'either' && (
          <label>
            Rate per month (₹)
            <input type="number" min={0} inputMode="decimal" value={rateMonth} onChange={(e) => { setSaved(false); setRateMonth(e.target.value); }} />
          </label>
        )}
      </div>

      <h4>Weekly timings</h4>
      {wins.map((w, i) => (
        <div className="winrow" key={i}>
          <select value={w.weekday} onChange={(e) => setWin(i, { weekday: Number(e.target.value) })}>
            {WEEKDAYS.map((d) => (
              <option key={d.v} value={d.v}>{d.l}</option>
            ))}
          </select>
          <input type="time" value={w.start} onChange={(e) => setWin(i, { start: e.target.value })} aria-label="Start time" />
          <span>to</span>
          <input type="time" value={w.end} onChange={(e) => setWin(i, { end: e.target.value })} aria-label="End time" />
          <span className="muted small">{slotsIn(w) > 0 ? `${slotsIn(w)} slot${slotsIn(w) > 1 ? 's' : ''}` : ''}</span>
          {wins.length > 1 && (
            <button type="button" className="linklike danger" onClick={() => { setSaved(false); setWins(wins.filter((_, idx) => idx !== i)); }}>
              Remove
            </button>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost" onClick={() => setWins([...wins, { weekday: 1, start: '', end: '' }])}>
        + Add another time
      </button>

      {error && <Notice kind="error">{error}</Notice>}
      {saved && <Notice kind="ok">Saved.</Notice>}
      <div className="actions">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : offering ? 'Update' : 'Publish'}</button>
        {offering && (
          <button className="btn btn-danger" onClick={remove} disabled={busy}>Remove listing</button>
        )}
      </div>
    </section>
  );
}
