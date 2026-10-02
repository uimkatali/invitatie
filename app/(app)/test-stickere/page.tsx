import { requireSession } from '@/lib/auth/require-session';
import StickerProbe from './StickerProbe';

// TEMPORAR (Plan A, spike): se sterge in Plan C, dupa ce stim ce trimite tastatura iPhone.
export default async function StickerTestPage() {
  await requireSession();
  return (
    <div className="stack">
      <h1>Test stickere</h1>
      <p className="muted">
        Pagina de test. Nu salveaza nimic. Pune un sticker din tastatura in casuta de mai jos, apoi apasa
        &quot;Copiaza raportul&quot; si trimite-l in chat.
      </p>
      <StickerProbe />
    </div>
  );
}
