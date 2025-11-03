'use client';

import { useEffect, useState } from 'react';
import type { AppConfig } from '@/app-config';
import { Button } from '@/components/livekit/button';
import { cn } from '@/lib/utils';
import type { RAGDataCategory, RAGDataEntry, RAGDataEntryInput } from '@/types/rag-data';

interface RAGConfigProps {
  ragConfig?: AppConfig['ragConfig'];
  onConfigChange: (config: AppConfig['ragConfig']) => void;
  className?: string;
}

const CATEGORIES: { value: RAGDataCategory; label: string; description: string }[] = [
  { value: 'product', label: 'Products', description: 'Product information, names, descriptions' },
  { value: 'service', label: 'Services', description: 'Service offerings and details' },
  { value: 'pricing', label: 'Pricing', description: 'Pricing information and plans' },
  { value: 'company', label: 'Company Info', description: 'Company details and information' },
  { value: 'other', label: 'Other', description: 'General information' },
];

export function RAGConfig({ ragConfig, onConfigChange, className }: RAGConfigProps) {
  const [collectionName, setCollectionName] = useState(ragConfig?.collectionName || '');
  const [topK, setTopK] = useState(ragConfig?.topK?.toString() || '5');
  const [activeTab, setActiveTab] = useState<'config' | 'data'>('data');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Data management state
  const [entries, setEntries] = useState<RAGDataEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RAGDataEntry | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);

  // Entry form state
  const [formData, setFormData] = useState<RAGDataEntryInput>({
    category: 'product',
    title: '',
    content: '',
    metadata: {},
  });
  const [metadataJson, setMetadataJson] = useState('');

  // Fetch entries
  const fetchEntries = async (category?: string) => {
    setLoading(true);
    try {
      const url =
        category && category !== 'all' ? `/api/rag/data?category=${category}` : '/api/rag/data';
      const res = await fetch(url);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(selectedCategory === 'all' ? undefined : selectedCategory);
  }, [selectedCategory]);

  const handleSaveConfig = () => {
    const newConfig: AppConfig['ragConfig'] = {
      ...(collectionName && { collectionName }),
      ...(topK && { topK: parseInt(topK, 10) }),
    };
    onConfigChange(Object.keys(newConfig).length > 0 ? newConfig : undefined);
  };

  const handleSaveEntry = async () => {
    if (!formData.title || !formData.content) {
      alert('Please fill in title and content');
      return;
    }

    try {
      let metadata = {};
      if (metadataJson.trim()) {
        try {
          metadata = JSON.parse(metadataJson);
        } catch {
          alert('Invalid JSON in metadata field');
          return;
        }
      }

      const payload = {
        ...formData,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      if (editingEntry) {
        // Update existing entry
        const res = await fetch(`/api/rag/data/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update entry');
      } else {
        // Create new entry
        const res = await fetch('/api/rag/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create entry');
      }

      // Reset form and refresh
      setFormData({ category: 'product', title: '', content: '', metadata: {} });
      setMetadataJson('');
      setEditingEntry(null);
      setShowEntryForm(false);
      fetchEntries(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry');
    }
  };

  const handleEditEntry = (entry: RAGDataEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      metadata: entry.metadata || {},
    });
    setMetadataJson(
      entry.metadata && Object.keys(entry.metadata).length > 0
        ? JSON.stringify(entry.metadata, null, 2)
        : ''
    );
    setShowEntryForm(true);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const res = await fetch(`/api/rag/data/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete entry');
      fetchEntries(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    }
  };

  const handleCancelForm = () => {
    setFormData({ category: 'product', title: '', content: '', metadata: {} });
    setMetadataJson('');
    setEditingEntry(null);
    setShowEntryForm(false);
  };

  const filteredEntries =
    selectedCategory === 'all' ? entries : entries.filter((e) => e.category === selectedCategory);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('data')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'data'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Knowledge Base Data
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'config'
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Configuration
        </button>
      </div>

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Filter:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted'
              )}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  selectedCategory === cat.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Add Entry Button */}
          {!showEntryForm && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowEntryForm(true);
                setEditingEntry(null);
                setFormData({ category: 'product', title: '', content: '', metadata: {} });
                setMetadataJson('');
              }}
            >
              + Add New Entry
            </Button>
          )}

          {/* Entry Form */}
          {showEntryForm && (
            <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{editingEntry ? 'Edit Entry' : 'Add New Entry'}</h4>
                <Button variant="ghost" size="sm" onClick={handleCancelForm}>
                  ✕
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as RAGDataCategory })
                    }
                    className="bg-background text-foreground w-full rounded-md border px-3 py-2"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Premium Product Package"
                    className="bg-background text-foreground w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter detailed information about the product, service, pricing, or company information..."
                    rows={6}
                    className="bg-background text-foreground w-full rounded-md border px-3 py-2"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    This content will be searchable by the AI agent. Include all relevant details
                    like prices, features, descriptions, etc.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Additional Metadata (JSON, optional)
                  </label>
                  <textarea
                    value={metadataJson}
                    onChange={(e) => setMetadataJson(e.target.value)}
                    placeholder='{"price": 99.99, "currency": "USD", "availability": "in-stock"}'
                    rows={3}
                    className="bg-background text-foreground w-full rounded-md border px-3 py-2 font-mono text-sm"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Optional: Add structured metadata like price, currency, availability, etc.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveEntry} className="flex-1">
                  {editingEntry ? 'Update Entry' : 'Save Entry'}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Entries List */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-muted-foreground py-4 text-center text-sm">Loading...</p>
            ) : filteredEntries.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No entries found. Add your first entry to get started!
              </p>
            ) : (
              filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-background hover:bg-muted/50 rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                          {CATEGORIES.find((c) => c.value === entry.category)?.label ||
                            entry.category}
                        </span>
                        <h5 className="truncate font-semibold">{entry.title}</h5>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-sm">{entry.content}</p>
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="text-muted-foreground mt-2 text-xs">
                          {Object.entries(entry.metadata)
                            .filter(([, v]) => v !== null && v !== undefined)
                            .map(([key, value]) => (
                              <span key={key} className="mr-3">
                                <strong>{key}:</strong> {String(value)}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEntry(entry)}
                        className="h-8 w-8 p-0"
                      >
                        ✎
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        🗑
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
          <div className="space-y-3">
            <div>
              <label htmlFor="collection-name" className="mb-1 block text-sm font-medium">
                Collection Name
              </label>
              <input
                id="collection-name"
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g., my-rag-collection"
                className="bg-background text-foreground w-full rounded-md border px-3 py-2"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Name for your RAG collection (used by the agent backend)
              </p>
            </div>

            <div>
              <label htmlFor="top-k" className="mb-1 block text-sm font-medium">
                Top K Results: {topK}
              </label>
              <input
                id="top-k"
                type="range"
                min="1"
                max="20"
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
                className="w-full"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Number of relevant results to retrieve from your knowledge base (1-20)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSaveConfig} className="flex-1">
              Save Configuration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
