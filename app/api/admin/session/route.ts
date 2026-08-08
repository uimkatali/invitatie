import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/session';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }
  const result = await verifySessionToken(token, process.env.SESSION_SECRET!);
  return NextResponse.json({ authenticated: result.valid });
}
