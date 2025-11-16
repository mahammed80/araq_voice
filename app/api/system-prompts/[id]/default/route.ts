import { NextRequest, NextResponse } from 'next/server';
import { systemPromptsStorage } from '@/lib/system-prompts-storage';

export const runtime = 'nodejs';

// POST - Set a prompt as default for its type
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prompt = systemPromptsStorage.setDefaultPrompt(params.id);
    return NextResponse.json({ prompt });
  } catch (error: any) {
    console.error('Error setting default prompt:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to set default prompt' },
      { status: 500 }
    );
  }
}

