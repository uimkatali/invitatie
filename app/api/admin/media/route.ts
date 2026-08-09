import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { del } from '@vercel/blob';
import { isValidZone } from '../../../../lib/media';

export async function GET(request: NextRequest) {
  const zone = request.nextUrl.searchParams.get('zone');
  const { rows } = zone
    ? await sql`SELECT * FROM media WHERE zone = ${zone} ORDER BY created_at DESC`
    : await sql`SELECT * FROM media ORDER BY created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { url, zone } = await request.json();
  if (!url || !isValidZone(zone)) {
    return NextResponse.json({ error: 'url si zone valide sunt obligatorii.' }, { status: 400 });
  }
  const { rows } = await sql`INSERT INTO media (url, zone) VALUES (${url}, ${zone}) RETURNING *`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id este obligatoriu.' }, { status: 400 });
  }
  const { rows } = await sql`SELECT url FROM media WHERE id = ${id}`;
  if (rows.length > 0) {
    await sql`DELETE FROM media WHERE id = ${id}`;
    await del(rows[0].url);
  }
  return NextResponse.json({ ok: true });
}
