'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/livekit/button';
import type { RAGDataCategory, RAGDataEntry, RAGDataEntryInput } from '@/types/rag-data';

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
      const url =
        category && category !== 'all' ? `/api/rag/data?category=${category}` : '/api/rag/data';
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Expected JSON but got:', text.substring(0, 200));
        throw new Error('Invalid response format');
      }
      
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      alert('فشل تحميل البيانات. يرجى المحاولة مرة أخرى.');
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
        } catch {
          alert('صيغة JSON غير صحيحة في حقل البيانات الإضافية');
          return;
        }
      }

      const payload = {
        ...formData,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      if (editingEntry) {
        // Verify entry exists before updating
        if (!editingEntry.id) {
          throw new Error('Entry ID is missing. Please refresh and try again.');
        }

        console.log('Updating entry:', editingEntry.id, payload);
        const res = await fetch(`/api/rag/data/${editingEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
          const contentType = res.headers.get('content-type');
          let errorData = { error: 'Unknown error' };
          
          if (contentType && contentType.includes('application/json')) {
            try {
              errorData = await res.json();
            } catch {
              const text = await res.text();
              console.error('Error response (non-JSON):', text.substring(0, 200));
              errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
            }
          } else {
            const text = await res.text();
            console.error('Error response (HTML):', text.substring(0, 200));
            errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
          }
          
          console.error('Update error response:', errorData, 'Status:', res.status);
          throw new Error(errorData.error || `Failed to update entry: ${res.status} ${res.statusText}`);
        }
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          console.error('Expected JSON but got:', text.substring(0, 200));
          throw new Error('Invalid response format');
        }
        
        const responseData = await res.json();
        console.log('Update successful:', responseData);
      } else {
        const res = await fetch('/api/rag/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const contentType = res.headers.get('content-type');
          let errorData = { error: 'Unknown error' };
          
          if (contentType && contentType.includes('application/json')) {
            try {
              errorData = await res.json();
            } catch {
              const text = await res.text();
              console.error('Error response (non-JSON):', text.substring(0, 200));
              errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
            }
          } else {
            const text = await res.text();
            console.error('Error response (HTML):', text.substring(0, 200));
            errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
          }
          
          throw new Error(errorData.error || `Failed to create entry: ${res.status} ${res.statusText}`);
        }
      }

      setFormData({ category: 'product', title: '', content: '', metadata: {} });
      setMetadataJson('');
      setEditingEntry(null);
      setShowEntryForm(false);
      fetchEntries(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (error) {
      console.error('Error saving entry:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل حفظ البيانات';
      alert(errorMessage);
    }
  };

  const handleEditEntry = async (entry: RAGDataEntry) => {
    // Verify entry still exists on server before editing
    try {
      const res = await fetch(`/api/rag/data/${entry.id}`);
      if (!res.ok) {
        alert('هذه البيانات لم تعد موجودة. يرجى تحديث القائمة.');
        fetchEntries(selectedCategory === 'all' ? undefined : selectedCategory);
        return;
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Expected JSON but got:', text.substring(0, 200));
        throw new Error('Invalid response format');
      }
      
      const { entry: serverEntry } = await res.json();
      
      setEditingEntry(serverEntry);
      setFormData({
        category: serverEntry.category,
        title: serverEntry.title,
        content: serverEntry.content,
        metadata: serverEntry.metadata || {},
      });
      setMetadataJson(
        serverEntry.metadata && Object.keys(serverEntry.metadata).length > 0
          ? JSON.stringify(serverEntry.metadata, null, 2)
          : ''
      );
      setShowEntryForm(true);
    } catch (error) {
      console.error('Error verifying entry:', error);
      alert('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.');
    }
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

  const filteredEntries =
    selectedCategory === 'all' ? entries : entries.filter((e) => e.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">إدارة بيانات الشركة</h3>
        <p className="muted-foreground mb-4 text-sm">
          أضف بيانات شركتك (منتجات، خدمات، أسعار، معلومات الشركة) التي سيجيب عليها المساعد
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">تصفية:</span>
        <button
          onClick={() => setSelectedCategory('all')}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
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
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
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
        <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              {editingEntry ? 'تعديل البيانات' : 'إضافة بيانات جديدة'}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEntryForm(false);
                setEditingEntry(null);
              }}
            >
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
              <p className="muted-foreground mt-1 text-xs">
                هذا المحتوى سيكون قابلاً للبحث بواسطة المساعد. أضف جميع التفاصيل المهمة مثل الأسعار
                والميزات والأوصاف
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
  );
}
