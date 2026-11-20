import { useCallback, useState } from 'react';
import type { Notice } from '../types';

/** Mensagem de erro/aviso. O contador faz a animação repetir quando a mesma mensagem aparece de novo. */
export function useNotice(initial = '') {
  const [notice, setNotice] = useState<Notice>({ message: initial, attempt: 0 });
  const show = useCallback((message: string) => setNotice(({ attempt }) => ({ message, attempt: attempt + 1 })), []);
  return [notice, show] as const;
}
