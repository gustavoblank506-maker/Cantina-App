import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Repete a tarefa a cada intervalo enquanto o app está aberto na tela. Falhas são ignoradas até a próxima vez. */
export function usePolling(task: () => unknown, intervalMs: number, enabled = true) {
  const latest = useRef(task);
  useEffect(() => {
    latest.current = task;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      Promise.resolve()
        .then(() => latest.current())
        .catch(() => {});
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
