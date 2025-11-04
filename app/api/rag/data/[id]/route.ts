import { NextRequest, NextResponse } from 'next/server';
import { RAGStorage } from '@/lib/rag-storage';
import type { RAGDataEntryInput } from '@/types/rag-data';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const entry = RAGStorage.getEntryById(id);

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error fetching RAG data entry:', error);
    return NextResponse.json({ error: 'Failed to fetch RAG data entry' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: Partial<RAGDataEntryInput> = await req.json();

    const updated = RAGStorage.updateEntry(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Error updating RAG data entry:', error);
    return NextResponse.json({ error: 'Failed to update RAG data entry' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = RAGStorage.deleteEntry(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting RAG data entry:', error);
    return NextResponse.json({ error: 'Failed to delete RAG data entry' }, { status: 500 });
  }
}
