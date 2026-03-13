import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  const expected = (process.env.REVALIDATION_SECRET || '').replace(/\\n$/g, '').trim();
  if (secret !== expected) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath('/dashboard', 'layout');
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
