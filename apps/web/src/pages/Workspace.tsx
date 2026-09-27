import { useEffect, useMemo, useReducer, useState } from 'react';
import { useParams } from 'react-router';
import type { Claim } from '@ps154/shared';
import type { BatchSnapshot, SourceRecord } from '../shared-temp';
import { api } from '../api';
import { fromSnapshot, reducer, type BatchView } from '../batch/state';
import { useBatchStream } from '../batch/useBatchStream';
import { SelectionContext } from '../selection';
import { SourcePane } from '../components/SourcePane';
import { CardView } from '../components/Card';
import { CardBoundary } from '../components/CardBoundary';

export default function Workspace() {
  const { id } = useParams();
  const [initial, setInitial] = useState<BatchView | null>(null);
  const [source, setSource] = useState<SourceRecord | null>(null);
  useEffect(() => {
    api<BatchSnapshot>(`/jobs/${id}`).then(async (s) => {
      setSource(await api<SourceRecord>(`/sources/${s.source_id}`));
      setInitial(fromSnapshot(s));
    });
  }, [id]);
  if (!initial || !source) return <p className="p-8">Loading batch…</p>;
  return <LiveBatch initial={initial} source={source} />;
}

function LiveBatch({ initial, source }: { initial: BatchView; source: SourceRecord }) {
  const [view, dispatch] = useReducer(reducer, initial);
  useBatchStream(initial.batch_id, initial.last_seq, (frame) => dispatch({ type: 'frame', frame }));
  const [active, setActive] = useState<Claim | null>(null);
  const activeRefs = useMemo(() => new Set(active?.source_refs ?? []), [active]);
  const cards = Object.values(view.cards);
  const ready = cards.filter((c) => c.status === 'ready').length;

  async function regenerate(task_id: string) {
    dispatch({ type: 'regenerating', task_id });
    await api(`/tasks/${task_id}/regenerate`, { method: 'POST' });
  }

  return (
    <SelectionContext.Provider value={{ active, select: setActive }}>
      <main className="grid h-screen grid-cols-[2fr_3fr]">
        <section className="overflow-y-auto border-r p-6">
          {active && active.source_refs.length === 0 && (
            <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-900">
              This sentence cites no passage in the source. It is marked unverified.
            </p>
          )}
          <SourcePane raw={source.raw_content} spans={source.spans} active={activeRefs} />
        </section>
        <section className="space-y-4 overflow-y-auto bg-slate-50 p-6">
          <p className="text-sm text-slate-600">{view.overall} · {ready} of {cards.length} ready</p>
          {cards.map((c) => (
            <CardBoundary key={c.task_id} label={c.format_id}>
              <CardView card={c} globalConfig={view.global_config}
                        onRegenerate={() => regenerate(c.task_id)} />
            </CardBoundary>
          ))}
        </section>
      </main>
    </SelectionContext.Provider>
  );
}
