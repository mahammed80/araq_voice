import type { RAGDataCategory, RAGDataEntry, RAGDataEntryInput } from '@/types/rag-data';
import { getRAGVectorStore } from './rag-vector-store';

// In-memory storage for RAG data
// In production, this should be replaced with a proper database (PostgreSQL, MongoDB, etc.)
// and vector database (Qdrant, Pinecone, Weaviate, etc.)

const ragDataStore: Map<string, RAGDataEntry> = new Map();
const vectorStore = getRAGVectorStore();

// Initialize with some example data
// Use fixed timestamp to avoid hydration issues
const INITIAL_TIMESTAMP = 1700000000000; // Fixed timestamp for initial data

if (ragDataStore.size === 0) {
  const initialData: RAGDataEntry[] = [
    {
      id: '1',
      category: 'company',
      title: 'Company Information',
      content:
        'AraQ is a leading AI technology company specializing in voice assistants and conversational AI solutions.',
      metadata: {},
      createdAt: INITIAL_TIMESTAMP,
      updatedAt: INITIAL_TIMESTAMP,
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

  static async createEntry(input: RAGDataEntryInput): Promise<RAGDataEntry> {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const entry: RAGDataEntry = {
      id,
      ...input,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    ragDataStore.set(id, entry);
    // Update vector store
    await this.updateVectorStore();
    return entry;
  }

  static async updateEntry(id: string, input: Partial<RAGDataEntryInput>): Promise<RAGDataEntry | null> {
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
    // Update vector store
    await this.updateVectorStore();
    return updated;
  }

  static async deleteEntry(id: string): Promise<boolean> {
    const deleted = ragDataStore.delete(id);
    if (deleted) {
      // Update vector store
      await this.updateVectorStore();
    }
    return deleted;
  }

  static searchEntries(query: string): RAGDataEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(ragDataStore.values()).filter(
      (entry) =>
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Get all data as a formatted string for agent context (legacy method)
  static getFormattedDataForAgent(category?: RAGDataCategory): string {
    const entries = category ? this.getEntriesByCategory(category) : this.getAllEntries();

    if (entries.length === 0) {
      return '';
    }

    const formatted = entries.map((entry) => {
      let text = `**${entry.title}** (${entry.category})\n${entry.content}`;
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        const metaStr = Object.entries(entry.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        text += `\n\nمعلومات إضافية: ${metaStr}`;
      }
      return text;
    });

    return formatted.join('\n\n---\n\n');
  }

  // Vector-based retrieval: Get relevant context based on query
  static async getRelevantContext(query: string, k: number = 4): Promise<string> {
    // Ensure vector store is up to date
    await this.updateVectorStore();
    
    // Search for similar documents
    const relevantDocs = await vectorStore.similaritySearch(query, k);
    
    if (relevantDocs.length === 0) {
      return '';
    }

    // Format the relevant chunks
    const formatted = relevantDocs.map((doc) => {
      let text = `**${doc.metadata.title}** (${doc.metadata.category})\n${doc.content}`;
      return text;
    });

    return formatted.join('\n\n---\n\n');
  }

  // Update vector store with all current entries
  private static async updateVectorStore(): Promise<void> {
    try {
      const allEntries = this.getAllEntries();
      await vectorStore.addEntries(allEntries);
    } catch (error) {
      console.error('Error updating vector store:', error);
      // Don't throw - vector store is optional, continue without it
    }
  }

  // Initialize vector store on startup
  static async initializeVectorStore(): Promise<void> {
    try {
      await this.updateVectorStore();
    } catch (error) {
      console.error('Error initializing vector store:', error);
      // Don't throw - vector store is optional
    }
  }
}

// Initialize vector store after class is defined
// Use setTimeout to defer initialization until after module load
if (typeof window === 'undefined') {
  // Server-side only
  setTimeout(() => {
    RAGStorage.initializeVectorStore().catch((err) => {
      console.error('Error initializing vector store:', err);
    });
  }, 0);
}
