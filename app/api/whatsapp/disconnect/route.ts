import { NextResponse } from 'next/server';
import { disconnectWhatsApp } from '@/lib/whatsapp-service';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await disconnectWhatsApp();
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Disconnected successfully' });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to disconnect' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect WhatsApp' },
      { status: 500 }
    );
  }
}

