import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export type LoadState = { failed: boolean; retry: () => void };

// Runs a screen's data load and remembers a failure, so the screen can offer a retry
// instead of staying on its skeleton. Pass a stable function (useCallback).
export function useLoad(
  load: () => Promise<unknown>,
  { onFocus = true }: { onFocus?: boolean } = {},
): LoadState {
  const [failed, setFailed] = useState(false);

  const run = useCallback(() => {
    setFailed(false);
    load().catch((error: unknown) => {
      console.warn('Loading failed', error);
      setFailed(true);
    });
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (onFocus) run();
    }, [onFocus, run]),
  );
  useEffect(() => {
    if (!onFocus) run();
  }, [onFocus, run]);

  return { failed, retry: run };
}
