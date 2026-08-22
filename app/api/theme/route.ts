import { NextRequest, NextResponse } from 'next/server';
import { THEME_CONFIGS } from '../../../lib/themes';
import { setActiveThemeId } from '../../../lib/edge-config';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corp de cerere invalid.' }, { status: 400 });
  }
  const id = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).id : undefined;
  if (typeof id !== 'string' || !THEME_CONFIGS.some((theme) => theme.id === id)) {
    return NextResponse.json({ error: 'Tema aleasa nu exista.' }, { status: 400 });
  }

  try {
    await setActiveThemeId(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
