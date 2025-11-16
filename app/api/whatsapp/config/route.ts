import { NextRequest, NextResponse } from 'next/server';
import { getConfig, updateConfig } from '@/lib/whatsapp-service';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const config = getConfig();
    // Always return a valid config object, even if empty
    return NextResponse.json({
      phoneNumber: config.phoneNumber || '',
      systemPrompt: config.systemPrompt || '',
      isConnected: config.isConnected || false,
      connectionStatus: config.connectionStatus || 'disconnected',
    });
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    // Return default config on error instead of error response
    return NextResponse.json({
      phoneNumber: '',
      systemPrompt: '',
      isConnected: false,
      connectionStatus: 'disconnected',
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumber, systemPrompt } = body;

    // Phone number is now optional - can connect with just QR code
    const updatedConfig = updateConfig({
      phoneNumber: phoneNumber || '',
      systemPrompt: systemPrompt || '',
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    return NextResponse.json(
      { error: 'Failed to update WhatsApp configuration' },
      { status: 500 }
    );
  }
}

