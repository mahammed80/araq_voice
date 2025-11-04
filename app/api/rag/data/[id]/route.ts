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

    console.log('PUT request for entry ID:', id, 'Body:', body);

    // Check if entry exists first
    const existing = RAGStorage.getEntryById(id);
    if (!existing) {
      console.error('Entry not found:', id);
      console.log('Available entries:', Array.from(RAGStorage.getAllEntries().map(e => e.id)));
      return NextResponse.json({ error: `Entry not found with ID: ${id}` }, { status: 404 });
    }

    // Validate required fields if provided
    if (body.title !== undefined && !body.title.trim()) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
    }
    if (body.content !== undefined && !body.content.trim()) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
    }

    // Clean up undefined metadata
    const cleanBody = { ...body };
    if (cleanBody.metadata === undefined) {
      delete cleanBody.metadata;
    }

    const updated = await RAGStorage.updateEntry(id, cleanBody);

    if (!updated) {
      console.error('Update failed for entry:', id);
      return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
    }

    console.log('Entry updated successfully:', updated.id);
    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Error updating RAG data entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update RAG data entry';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await RAGStorage.deleteEntry(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting RAG data entry:', error);
    return NextResponse.json({ error: 'Failed to delete RAG data entry' }, { status: 500 });
  }
}
