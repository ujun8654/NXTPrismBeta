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
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      {title && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-900/50 hover:bg-gray-900 text-sm text-gray-300 transition-colors"
        >
          <span>{title}</span>
          <span className="text-gray-500">{expanded ? '▼' : '▶'}</span>
        </button>
      )}
      {(expanded || !title) && (
        <pre className="p-4 text-xs text-green-300/80 bg-gray-950 overflow-x-auto max-h-96">
          {json}
        </pre>
      )}
    </div>
  );
}
