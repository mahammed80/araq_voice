import { NextResponse } from 'next/server';
import { getQRCode } from '@/lib/whatsapp-service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const qrCode = getQRCode();
    console.log('QR Code API called, QR code available:', !!qrCode);
    if (qrCode) {
      console.log('Returning QR code, length:', qrCode.length);
      return NextResponse.json({ qrCode });
    } else {
      console.log('No QR code available yet');
      return NextResponse.json({ qrCode: null });
    }
  } catch (error) {
    console.error('Error fetching QR code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR code', qrCode: null },
      { status: 500 }
    );
  }
}

