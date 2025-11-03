export type RAGDataCategory = 'product' | 'service' | 'pricing' | 'company' | 'other';

export interface RAGDataEntry {
  id: string;
  category: RAGDataCategory;
  title: string;
  content: string;
  metadata?: {
    price?: number;
    currency?: string;
    availability?: string;
    [key: string]: any;
  };
  createdAt: number;
  updatedAt: number;
}

export interface RAGDataEntryInput {
  category: RAGDataCategory;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

