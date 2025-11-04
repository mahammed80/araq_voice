import { NextRequest, NextResponse } from 'next/server';
import { RAGStorage } from '@/lib/rag-storage';
import type { RAGDataCategory } from '@/types/rag-data';

const VALID_CATEGORIES: RAGDataCategory[] = ['product', 'service', 'pricing', 'company', 'other'];

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const categoryParam = searchParams.get('category');
    const collectionName = searchParams.get('collection');

    // Validate category if provided
    const category: RAGDataCategory | undefined =
      categoryParam && VALID_CATEGORIES.includes(categoryParam as RAGDataCategory)
        ? (categoryParam as RAGDataCategory)
        : undefined;

    // Get formatted data for agent consumption
    const formattedData = RAGStorage.getFormattedDataForAgent(category);

    return NextResponse.json({
      collection: collectionName || 'default',
      data: formattedData,
      entryCount: formattedData ? formattedData.split('\n\n').length : 0,
    });
  } catch (error) {
    console.error('Error fetching formatted RAG data:', error);
    return NextResponse.json({ error: 'Failed to fetch formatted RAG data' }, { status: 500 });
  }
}
