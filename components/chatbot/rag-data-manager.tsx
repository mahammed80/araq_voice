'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/livekit/button';
import type { RAGDataEntry, RAGDataEntryInput, RAGDataCategory } from '@/types/rag-data';

const CATEGORIES: { value: RAGDataCategory; label: string }[] = [
  { value: 'product', label: 'Products' },
  { value: 'service', label: 'Services' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'company', label: 'Company Info' },
  { value: 'other', label: 'Other' },
];

export function RAGDataManager() {
  const [entries, setEntries] = useState<RAGDataEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingEntry, setEditingEntry] = useState<RAGDataEntry | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  
  const [formData, setFormData] = useState<RAGDataEntryInput>({
    category: 'product',
    title: '',
    content: '',
    metadata: {},
  });
  const [metadataJson, setMetadataJson] = useState('');

  const fetchEntries = async (category?: string) => {
    setLoading(true);
    try {
      const url = category && category !== 'all' 
        ? `/api/rag/data?category=${category}`
        : '/api/rag/data';
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

  const handleSaveEntry = async () => {
    if (!formData.title || !formData.content) {
      alert('الرجاء ملء العنوان والمحتوى');
      return;
    }

    try {
      let metadata = {};
      if (metadataJson.trim()) {
        try {
          metadata = JSON.parse(metadataJson);
        } catch (e) {
          alert('صيغة JSON غير صحيحة في حقل البيانات الإضافية');
          return;
        }
      }

      const payload = {
        ...formData,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      if (editingEntry) {
        const res = await fetch(`/api/rag/data/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update entry');
      } else {
        const res = await fetch('/api/rag/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create entry');
      }

      setFormData({ category: 'product', title: '', content: '', metadata: {} });
      setMetadataJson('');
      setEditingEntry(null);
      setShowEntryForm(false);
      fetchEntries(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('فشل حفظ البيانات');
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
    if (!confirm('هل أنت متأكد من حذف هذه البيانات؟')) return;

    try {
      const res = await fetch(`/api/rag/data/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete entry');
      fetchEntries(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('فشل حذف البيانات');
    }
  };

  const filteredEntries = selectedCategory === 'all' 
    ? entries 
    : entries.filter((e) => e.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">إدارة بيانات الشركة</h3>
        <p className="text-sm text-muted-foreground mb-4">
          أضف بيانات شركتك (منتجات، خدمات، أسعار، معلومات الشركة) التي سيجيب عليها المساعد
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">تصفية:</span>
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background hover:bg-muted'
          }`}
        >
          الكل
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              selectedCategory === cat.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted'
            }`}
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
          + إضافة بيانات جديدة
        </Button>
      )}

      {/* Entry Form */}
      {showEntryForm && (
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              {editingEntry ? 'تعديل البيانات' : 'إضافة بيانات جديدة'}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => {
              setShowEntryForm(false);
              setEditingEntry(null);
            }}>
              ✕
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">الفئة</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as RAGDataCategory })
                }
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
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
                العنوان <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: باقة البريميوم"
                className="bg-background text-foreground w-full rounded-md border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                المحتوى <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="أدخل التفاصيل الكاملة عن المنتج، الخدمة، السعر، أو معلومات الشركة..."
                rows={6}
                className="bg-background text-foreground w-full rounded-md border px-3 py-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                هذا المحتوى سيكون قابلاً للبحث بواسطة المساعد. أضف جميع التفاصيل المهمة مثل الأسعار والميزات والأوصاف
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                بيانات إضافية (JSON، اختياري)
              </label>
              <textarea
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                placeholder='{"price": 99.99, "currency": "SAR", "availability": "متوفر"}'
                rows={3}
                className="bg-background text-foreground w-full rounded-md border px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSaveEntry} className="flex-1">
              {editingEntry ? 'تحديث' : 'حفظ'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEntryForm(false);
                setEditingEntry(null);
              }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="muted-foreground py-4 text-center text-sm">جاري التحميل...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="muted-foreground py-4 text-center text-sm">
            لا توجد بيانات. أضف أول بياناتك للبدء!
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
                      {CATEGORIES.find((c) => c.value === entry.category)?.label || entry.category}
                    </span>
                    <h5 className="truncate font-semibold">{entry.title}</h5>
                  </div>
                  <p className="muted-foreground line-clamp-2 text-sm">{entry.content}</p>
                </div>
                <div className="shrink-0 flex gap-1">
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
  );
}
