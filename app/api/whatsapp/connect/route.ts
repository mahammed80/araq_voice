import { NextResponse } from 'next/server';
import { connectWhatsApp } from '@/lib/whatsapp-service';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await connectWhatsApp();
    
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Connection initiated' });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to connect' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error connecting WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to connect WhatsApp' },
      { status: 500 }
    );
  }
}

