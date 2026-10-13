import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Offering, Provider } from '../lib/types';
import { OfferingEditor } from './OfferingEditor';
import { BatchEditor } from './BatchEditor';
import { Notice } from './Layout';

export function ScheduleManager({ provider }: { provider: Provider }) {
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingBatch, setAddingBatch] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('offerings')
      .select('*, availability(*)')
      .eq('provider_id', provider.id)
      .order('created_at');
    if (err) setError(err.message);
    else setOfferings((data ?? []) as Offering[]);
  }, [provider.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!offerings) return <p className="muted">Loading your timings…</p>;

  const one = (kind: Offering['kind']) => offerings.find((o) => o.kind === kind);
  const batches = offerings.filter((o) => o.kind === 'yoga_group');

  if (provider.provider_type === 'physiotherapist') {
    return (
      <div className="stack">
        <OfferingEditor
          key={`clinic-${one('physio_clinic')?.id ?? 'new'}`}
          kind="physio_clinic"
          title="Clinic visits"
          help="Days and hours you see patients at your clinic, with your rate per session."
          fixedSlot={null}
          rates="session"
          offering={one('physio_clinic')}
          onSaved={load}
        />
        <OfferingEditor
          key={`home-${one('physio_home')?.id ?? 'new'}`}
          kind="physio_home"
          title="Home visits (45-minute slots)"
          help="Hours you are available for home visits. Each appointment is a 45-minute slot, so every time window must be a multiple of 45 minutes (45, 90, 135…)."
          fixedSlot={45}
          rates="session"
          offering={one('physio_home')}
          onSaved={load}
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head">
          <h3>Group classes (1-hour batches)</h3>
        </div>
        <p className="muted">Each batch is exactly 1 hour, on the days you choose, with its own monthly fee. You can publish more than one batch.</p>
        {batches.map((b, i) => (
          <BatchEditor key={b.id} offering={b} defaultLabel={`Batch ${i + 1}`} onSaved={load} />
        ))}
        {addingBatch ? (
          <BatchEditor
            defaultLabel={`Batch ${batches.length + 1}`}
            onSaved={() => { setAddingBatch(false); load(); }}
            onCancel={() => setAddingBatch(false)}
          />
        ) : (
          <button className="btn btn-ghost" onClick={() => setAddingBatch(true)}>+ Add {batches.length ? 'another' : 'a'} batch</button>
        )}
      </section>

      <OfferingEditor
        key={`yhome-${one('yoga_home')?.id ?? 'new'}`}
        kind="yoga_home"
        title="Home visits (1-hour slots)"
        help="Hours you are available for one-to-one classes at the student's home. Each appointment is a 1-hour slot. Give your rate per session, per month, or both."
        fixedSlot={60}
        rates="either"
        offering={one('yoga_home')}
        onSaved={load}
      />
    </div>
  );
}
