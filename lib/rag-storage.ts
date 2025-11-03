import type { RAGDataEntry, RAGDataEntryInput, RAGDataCategory } from '@/types/rag-data';

// In-memory storage for RAG data
// In production, this should be replaced with a proper database (PostgreSQL, MongoDB, etc.)
// and vector database (Qdrant, Pinecone, Weaviate, etc.)

let ragDataStore: Map<string, RAGDataEntry> = new Map();

// Initialize with some example data
if (ragDataStore.size === 0) {
  const initialData: RAGDataEntry[] = [
    {
      id: '1',
      category: 'company',
      title: 'Company Information',
      content: 'AraQ is a leading AI technology company specializing in voice assistants and conversational AI solutions.',
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  initialData.forEach((entry) => {
    ragDataStore.set(entry.id, entry);
  });
}

export class RAGStorage {
  static getAllEntries(): RAGDataEntry[] {
    return Array.from(ragDataStore.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static getEntryById(id: string): RAGDataEntry | undefined {
    return ragDataStore.get(id);
  }

  static getEntriesByCategory(category: RAGDataCategory): RAGDataEntry[] {
    return Array.from(ragDataStore.values())
      .filter((entry) => entry.category === category)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static createEntry(input: RAGDataEntryInput): RAGDataEntry {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const entry: RAGDataEntry = {
      id,
      ...input,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    ragDataStore.set(id, entry);
    return entry;
  }

  static updateEntry(id: string, input: Partial<RAGDataEntryInput>): RAGDataEntry | null {
    const existing = ragDataStore.get(id);
    if (!existing) {
      return null;
    }

    const updated: RAGDataEntry = {
      ...existing,
      ...input,
      updatedAt: Date.now(),
    };
    ragDataStore.set(id, updated);
    return updated;
  }

  static deleteEntry(id: string): boolean {
    return ragDataStore.delete(id);
  }

  static searchEntries(query: string): RAGDataEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(ragDataStore.values()).filter(
      (entry) =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Get all data as a formatted string for agent context
  static getFormattedDataForAgent(category?: RAGDataCategory): string {
    const entries = category
      ? this.getEntriesByCategory(category)
      : this.getAllEntries();

    if (entries.length === 0) {
      return '';
    }

    const formatted = entries.map((entry) => {
      let text = `[${entry.category.toUpperCase()}] ${entry.title}\n${entry.content}`;
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        const metaStr = Object.entries(entry.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        text += `\nMetadata: ${metaStr}`;
      }
      return text;
    });

    return formatted.join('\n\n');
  }
}

