'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Cere o singura data un refresh al arborelui de rute la montare. Folosit cand pagina a schimbat
 * date afisate de layout (ex. badge-ul de notificari necitite), pe care navigarea client nu le
 * re-randeaza singura.
 */
export default function RefreshOnMount() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    router.refresh();
  }, [router]);
  return null;
}
