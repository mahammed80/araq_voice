import { NextRequest, NextResponse } from 'next/server';
import { systemPromptsStorage } from '@/lib/system-prompts-storage';

export const runtime = 'nodejs';

// GET - Get a specific system prompt by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prompt = systemPromptsStorage.getPromptById(params.id);
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error fetching system prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompt' },
      { status: 500 }
    );
  }
}

// PUT - Update a system prompt
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, description, prompt, type, isDefault } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (prompt !== undefined) updates.prompt = prompt;
    if (type !== undefined) {
      if (!['chat', 'whatsapp', 'general'].includes(type)) {
        return NextResponse.json(
          { error: 'Invalid type. Must be: chat, whatsapp, or general' },
          { status: 400 }
        );
      }
      updates.type = type;
    }
    if (isDefault !== undefined) updates.isDefault = isDefault;

    const updatedPrompt = systemPromptsStorage.updatePrompt(params.id, updates);
    return NextResponse.json({ prompt: updatedPrompt });
  } catch (error: any) {
    console.error('Error updating system prompt:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update system prompt' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a system prompt
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = systemPromptsStorage.deletePrompt(params.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting system prompt:', error);
    if (error.message.includes('Cannot delete default')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete system prompt' },
      { status: 500 }
    );
  }
}

