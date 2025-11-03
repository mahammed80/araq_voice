import { NextRequest, NextResponse } from 'next/server';
import { RAGStorage } from '@/lib/rag-storage';
import type { RAGDataEntryInput } from '@/types/rag-data';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let entries;

    if (search) {
      entries = RAGStorage.searchEntries(search);
    } else if (category) {
      entries = RAGStorage.getEntriesByCategory(category);
    } else {
      entries = RAGStorage.getAllEntries();
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error fetching RAG data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RAG data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: RAGDataEntryInput = await req.json();

    // Validate required fields
    if (!body.category || !body.title || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: category, title, content' },
        { status: 400 }
      );
    }

    const entry = RAGStorage.createEntry(body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating RAG data entry:', error);
    return NextResponse.json(
      { error: 'Failed to create RAG data entry' },
      { status: 500 }
    );
  }
}

