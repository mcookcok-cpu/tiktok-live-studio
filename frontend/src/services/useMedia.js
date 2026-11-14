import { useEffect, useState } from 'react';

export function useMedia(query) {
  const [m, setM] = useState(() => (typeof matchMedia === 'function' ? matchMedia(query).matches : false));
  useEffect(() => {
    const mq = matchMedia(query);
    const f = () => setM(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [query]);
  return m;
}
export const useIsMobile = () => useMedia('(max-width: 767px)');
export const useCoarse = () => useMedia('(pointer: coarse)');
