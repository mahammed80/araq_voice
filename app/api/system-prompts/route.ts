import { NextRequest, NextResponse } from 'next/server';
import { systemPromptsStorage, SystemPrompt } from '@/lib/system-prompts-storage';

export const runtime = 'nodejs';

// GET - Get all system prompts or filter by type
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as 'chat' | 'whatsapp' | 'general' | null;

    let prompts: SystemPrompt[];
    if (type) {
      prompts = systemPromptsStorage.getPromptsByType(type);
    } else {
      prompts = systemPromptsStorage.getAllPrompts();
    }

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompts' },
      { status: 500 }
    );
  }
}

// POST - Create a new system prompt
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, prompt, type, isDefault } = body;

    if (!name || !prompt || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, prompt, type' },
        { status: 400 }
      );
    }

    if (!['chat', 'whatsapp', 'general'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: chat, whatsapp, or general' },
        { status: 400 }
      );
    }

    const newPrompt = systemPromptsStorage.createPrompt({
      name,
      description: description || '',
      prompt,
      type,
      isDefault: isDefault || false,
    });

    return NextResponse.json({ prompt: newPrompt }, { status: 201 });
  } catch (error) {
    console.error('Error creating system prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create system prompt' },
      { status: 500 }
    );
  }
}

