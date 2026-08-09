import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => {
      return { allowedContentTypes: ['image/*', 'video/*'] };
    },
    onUploadCompleted: async () => {},
  });

  return NextResponse.json(jsonResponse);
}
