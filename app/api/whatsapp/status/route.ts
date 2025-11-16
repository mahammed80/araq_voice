import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/whatsapp-service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = getStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching WhatsApp status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WhatsApp status' },
      { status: 500 }
    );
  }
}

