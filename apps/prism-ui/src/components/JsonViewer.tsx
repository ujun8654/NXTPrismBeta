import { useState } from 'react';

interface Props {
  data: unknown;
  title?: string;
  defaultExpanded?: boolean;
}

export default function JsonViewer({ data, title, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const json = JSON.stringify(data, null, 2);

  return (
    <div className="rounded-lg overflow-hidden border border-neutral-800">
      {title && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800/80 text-xs text-neutral-400 transition-colors"
        >
          <span>{title}</span>
          <span className="text-[10px]">{expanded ? '▾' : '▸'}</span>
        </button>
      )}
      {(expanded || !title) && (
        <pre className="p-4 text-[11px] leading-relaxed text-neutral-400 font-mono bg-atc-black overflow-x-auto max-h-96">
          {json}
        </pre>
      )}
    </div>
  );
}
