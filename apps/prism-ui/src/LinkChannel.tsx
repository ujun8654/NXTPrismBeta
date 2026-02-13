import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * Link Channel — cross-workspace context propagation.
 * Any panel can publish a "linked" entity (evidence_id, asset, override_id, etc.)
 * and any other panel/workspace can subscribe and react to it.
 */
export interface LinkPayload {
  type: 'evidence' | 'asset' | 'override' | 'export';
  id: string;
  meta?: Record<string, unknown>;
}

interface LinkChannelCtx {
  current: LinkPayload | null;
  publish: (payload: LinkPayload) => void;
  clear: () => void;
}

const Ctx = createContext<LinkChannelCtx>({
  current: null,
  publish: () => {},
  clear: () => {},
});

export function LinkChannelProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<LinkPayload | null>(null);
  const publish = useCallback((p: LinkPayload) => setCurrent(p), []);
  const clear = useCallback(() => setCurrent(null), []);
  return <Ctx.Provider value={{ current, publish, clear }}>{children}</Ctx.Provider>;
}

export function useLinkChannel() {
  return useContext(Ctx);
}
