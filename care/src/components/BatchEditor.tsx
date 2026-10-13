import { useState } from 'react';
import { supabase, messageOf } from '../lib/supabase';
import { WEEKDAYS, type Offering } from '../lib/types';
import { addMinutes, hhmm } from '../lib/time';
import { Notice } from './Layout';

interface Props {
  offering?: Offering;
  defaultLabel: string;
  onSaved: () => void;
  onCancel?: () => void;
}

/** One yoga group batch: 1 hour long, on chosen weekdays, with a rate per month. */
export function BatchEditor({ offering, defaultLabel, onSaved, onCancel }: Props) {
  const [label, setLabel] = useState(offering?.label ?? defaultLabel);
  const [days, setDays] = useState<number[]>(offering ? offering.availability.map((a) => a.weekday) : []);
  const [start, setStart] = useState(offering?.availability[0] ? hhmm(offering.availability[0].start_time) : '');
  const [rate, setRate] = useState(offering?.rate_per_month?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const end = addMinutes(start, 60);
  const toggle = (d: number) => {
    setSaved(false);
    setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  };

  async function save() {
    setError(null);
    if (!label.trim()) return setError('Give this batch a name, for example "Morning batch".');
    if (days.length === 0) return setError('Select at least one day.');
    if (!start || !end) return setError('Choose a start time (the batch is exactly 1 hour long and must finish before midnight).');
    const r = rate.trim() === '' ? NaN : Number(rate);
    if (!(r >= 0)) return setError('Enter the monthly fee for this batch.');

    setBusy(true);
    try {
      const { error: err } = await supabase.rpc('save_offering', {
        p_offering_id: offering?.id ?? null,
        p_kind: 'yoga_group',
        p_label: label.trim(),
        p_slot_minutes: 60,
        p_rate_session: null,
        p_rate_month: r,
        p_windows: days.map((d) => ({ weekday: d, start, end })),
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
    if (!offering || !window.confirm('Remove this batch?')) return;
    setBusy(true);
    const { error: err } = await supabase.from('offerings').delete().eq('id', offering.id);
    setBusy(false);
    if (err) setError(err.message);
    else onSaved();
  }

  return (
    <div className="subcard">
      <div className="card-head">
        <input className="labelinput" value={label} onChange={(e) => { setSaved(false); setLabel(e.target.value); }} maxLength={60} aria-label="Batch name" />
        {offering && <span className="badge badge-ok">Published</span>}
      </div>

      <div className="daypick">
        {WEEKDAYS.map((d) => (
          <button type="button" key={d.v} className={`chip ${days.includes(d.v) ? 'chip-on' : ''}`} onClick={() => toggle(d.v)}>
            {d.l}
          </button>
        ))}
      </div>

      <div className="row">
        <label>
          Start time
          <input type="time" value={start} onChange={(e) => { setSaved(false); setStart(e.target.value); }} />
        </label>
        <label>
          Ends (1 hour batch)
          <input type="time" value={end} readOnly />
        </label>
        <label>
          Fee per month (₹)
          <input type="number" min={0} inputMode="decimal" value={rate} onChange={(e) => { setSaved(false); setRate(e.target.value); }} />
        </label>
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {saved && <Notice kind="ok">Saved.</Notice>}
      <div className="actions">
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : offering ? 'Update batch' : 'Publish batch'}</button>
        {offering && <button className="btn btn-danger" onClick={remove} disabled={busy}>Remove batch</button>}
        {!offering && onCancel && <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}
