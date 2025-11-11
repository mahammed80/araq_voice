import type { RAGDataCategory, RAGDataEntry } from '@/types/rag-data';

// Simple text splitter (replaces LangChain's RecursiveCharacterTextSplitter)
class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(options: { chunkSize: number; chunkOverlap: number }) {
    this.chunkSize = options.chunkSize;
    this.chunkOverlap = options.chunkOverlap;
  }

  async splitText(text: string): Promise<string[]> {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + this.chunkSize;

      // If not at the end, try to split at a sentence or paragraph boundary
      if (end < text.length) {
        // Try to find a good break point (newline, period, or space)
        const chunk = text.substring(start, end);
        const lastNewline = chunk.lastIndexOf('\n\n');
        const lastPeriod = chunk.lastIndexOf('. ');
        const lastSpace = chunk.lastIndexOf(' ');

        if (lastNewline > this.chunkSize * 0.5) {
          end = start + lastNewline + 2;
        } else if (lastPeriod > this.chunkSize * 0.5) {
          end = start + lastPeriod + 2;
        } else if (lastSpace > this.chunkSize * 0.5) {
          end = start + lastSpace + 1;
        }
      }

      chunks.push(text.substring(start, end));
      start = end - this.chunkOverlap;
    }

    return chunks;
  }
}

// Simple in-memory vector store with cosine similarity
interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    entryId: string;
    title: string;
    category: RAGDataCategory;
    chunkIndex: number;
  };
  embedding: number[];
}

// Simple embedding function using text similarity (for now)
// In production, use a proper embedding model like OpenAI, Cohere, or HuggingFace
class SimpleEmbeddings {
  // Simple TF-IDF-like embedding using word frequency
  async embedDocuments(texts: string[]): Promise<number[][]> {
    // For MVP: simple bag-of-words approach
    // In production, replace with actual embedding model
    return texts.map((text) => this.simpleEmbed(text));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.simpleEmbed(text);
  }

  private simpleEmbed(text: string): number[] {
    // Simple character-based embedding for demonstration
    // In production, use proper embeddings (OpenAI, Cohere, etc.)
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(384).fill(0); // 384 dimensions like MiniLM

    words.forEach((word) => {
      const hash = this.simpleHash(word);
      const index = hash % 384;
      vector[index] = (vector[index] || 0) + 1 / (words.length || 1);
    });

    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

class RAGVectorStore {
  private documents: VectorDocument[] = [];
  private embeddings: SimpleEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = new SimpleEmbeddings();
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  // Add entries to vector store
  async addEntries(entries: RAGDataEntry[]): Promise<void> {
    try {
      this.documents = []; // Clear existing documents

      if (entries.length === 0) {
        console.log('No entries to add to vector store');
        return;
      }

      for (const entry of entries) {
        try {
          // Combine title and content
          const fullText = `${entry.title}\n\n${entry.content}`;

          if (!fullText.trim()) {
            console.warn(`Skipping empty entry: ${entry.id}`);
            continue;
          }

          // Split into chunks
          const chunks = await this.textSplitter.splitText(fullText);

          if (chunks.length === 0) {
            console.warn(`No chunks created for entry: ${entry.id}`);
            continue;
          }

          // Create embeddings for each chunk
          const chunkEmbeddings = await this.embeddings.embedDocuments(chunks);
          // Create vector documents
          chunks.forEach((chunk, index) => {
            if (chunkEmbeddings[index] && chunkEmbeddings[index].length > 0) {
              this.documents.push({
                id: `${entry.id}-chunk-${index}`,
                content: chunk,
                metadata: {
                  entryId: entry.id,
                  title: entry.title,
                  category: entry.category,
                  chunkIndex: index,
                },
                embedding: chunkEmbeddings[index],
              });
            }
          });
        } catch (entryError) {
          console.error(`Error processing entry ${entry.id}:`, entryError);
          // Continue with other entries
        }
      }

      console.log(
        `Vector store updated: ${this.documents.length} chunks from ${entries.length} entries`
      );
    } catch (error) {
      console.error('Error in addEntries:', error);
      throw error;
    }
  }

  // Search for similar documents
  async similaritySearch(query: string, k: number = 4): Promise<VectorDocument[]> {
    if (this.documents.length === 0) {
      return [];
    }

    // Get query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);

    // Calculate cosine similarity
    const scoredDocs = this.documents.map((doc) => {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return { doc, similarity };
    });

    // Sort by similarity and return top k
    return scoredDocs
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map((item) => item.doc);
  }

  // Cosine similarity calculation
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Get all documents
  getAllDocuments(): VectorDocument[] {
    return this.documents;
  }

  // Clear all documents
  clear(): void {
    this.documents = [];
  }
}

// Singleton instance
let vectorStoreInstance: RAGVectorStore | null = null;

export function getRAGVectorStore(): RAGVectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new RAGVectorStore();
  }
  return vectorStoreInstance;
}
