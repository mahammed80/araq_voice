'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/livekit/button';
import { X, CheckCircle, WarningCircle } from '@phosphor-icons/react/dist/ssr';

interface WhatsAppSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WhatsAppConfig {
  phoneNumber: string;
  systemPrompt: string;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export function WhatsAppSettings({ isOpen, onClose }: WhatsAppSettingsProps) {
  const [config, setConfig] = useState<WhatsAppConfig>({
    phoneNumber: '',
    systemPrompt: '',
    isConnected: false,
    connectionStatus: 'disconnected',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // Only fetch in browser environment
    if (typeof window === 'undefined') return;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Don't override 'connecting' status if we're currently connecting
        // This prevents clearing the QR code while waiting for it
        setConfig((prev) => {
          // If we're connecting, keep that status unless backend says connected/error
          if (prev.connectionStatus === 'connecting' && data.connectionStatus === 'disconnected') {
            console.log('⚠️ Backend says disconnected, but we\'re connecting - keeping connecting status');
            return { ...prev, ...data, connectionStatus: 'connecting' };
          }
          return { ...prev, ...data };
        });
      } else {
        console.error('Failed to fetch WhatsApp config:', response.status, response.statusText);
        // Only set default if not currently connecting
        setConfig((prev) => {
          if (prev.connectionStatus === 'connecting') {
            return prev; // Keep connecting status
          }
          return {
            phoneNumber: '',
            systemPrompt: '',
            isConnected: false,
            connectionStatus: 'disconnected',
          };
        });
      }
    } catch (err) {
      console.error('Error fetching WhatsApp config:', err);
      // Only set default if not currently connecting
      setConfig((prev) => {
        if (prev.connectionStatus === 'connecting') {
          return prev; // Keep connecting status
        }
        return {
          phoneNumber: '',
          systemPrompt: '',
          isConnected: false,
          connectionStatus: 'disconnected',
        };
      });
    }
  }, []);

  const fetchQRCode = useCallback(async () => {
    // Only fetch in browser environment
    if (typeof window === 'undefined') return;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL || 'http://localhost:3002';
      const apiUrl = `${backendUrl}/api/qrcode`;
      console.log('🔄 Fetching QR code from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache', // Ensure we get fresh QR code
      });
      
      console.log('📡 QR code response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 QR code response data:', {
          hasQrCode: !!data.qrCode,
          qrCodeLength: data.qrCode?.length,
          qrCodePreview: data.qrCode?.substring(0, 50),
        });
        
        if (data.qrCode && data.qrCode.trim()) {
          // Ensure QR code has proper format
          let formattedQrCode = data.qrCode;
          if (!formattedQrCode.startsWith('data:image')) {
            formattedQrCode = `data:image/png;base64,${formattedQrCode}`;
            console.log('🔧 Formatted QR code with data URL prefix');
          }
          
          console.log('✅ QR Code received from backend, length:', formattedQrCode.length);
          setQrCode(formattedQrCode);
        } else {
          console.log('⏳ No QR code available yet from backend (response was null/empty)');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch QR code, status:', response.status);
        console.error('   Error response:', errorText);
      }
    } catch (err) {
      console.error('❌ Error fetching QR code:', err);
      if (err instanceof Error) {
        console.error('   Error message:', err.message);
        console.error('   Error stack:', err.stack);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen, fetchConfig]);

  useEffect(() => {
    // Poll for QR code when connecting
    let qrInterval: NodeJS.Timeout | null = null;
    if (isOpen && config.connectionStatus === 'connecting') {
      const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL || 'http://localhost:3002';
      console.log('🔄 Starting QR code polling...');
      console.log('   Backend URL:', backendUrl);
      console.log('   Connection status:', config.connectionStatus);
      fetchQRCode(); // Fetch immediately
      qrInterval = setInterval(() => {
        fetchQRCode();
      }, 2000); // Poll every 2 seconds
    } else if (config.connectionStatus !== 'connecting') {
      // Clear QR code when not connecting anymore
      console.log('🧹 Clearing QR code (not connecting)');
      setQrCode(null);
    }
    return () => {
      if (qrInterval) {
        console.log('⏹️ Stopping QR code polling');
        clearInterval(qrInterval);
      }
    };
  }, [isOpen, config.connectionStatus, fetchQRCode]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: config.phoneNumber,
          systemPrompt: config.systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      setSuccess('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL || 'http://localhost:3002';
      console.log('🔌 Attempting to connect to WhatsApp...');
      const response = await fetch(`${backendUrl}/api/connect`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect');
      }

      const data = await response.json();
      console.log('✅ Connect API response:', data);
      
      // Set status to connecting immediately
      setConfig((prev) => ({
        ...prev,
        connectionStatus: 'connecting',
      }));
      
      console.log('🔄 Connection status set to "connecting", starting QR code polling...');

      // Poll for connection status
      pollConnectionStatus();
    } catch (err) {
      console.error('❌ Error connecting:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال');
      setConfig((prev) => ({ ...prev, connectionStatus: 'error' }));
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/api/disconnect`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setConfig((prev) => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected',
      }));
      setSuccess('تم قطع الاتصال بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء قطع الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const pollConnectionStatus = async () => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL || 'http://localhost:3002';
        const response = await fetch(`${backendUrl}/api/status`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'connected') {
            setConfig((prev) => ({
              ...prev,
              isConnected: true,
              connectionStatus: 'connected',
            }));
            setSuccess('تم الاتصال بنجاح');
            setTimeout(() => setSuccess(null), 3000);
            clearInterval(interval);
            setLoading(false);
          } else if (data.status === 'error') {
            setError('فشل الاتصال');
            setConfig((prev) => ({ ...prev, connectionStatus: 'error' }));
            clearInterval(interval);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setError('انتهت مهلة الاتصال');
        setConfig((prev) => ({ ...prev, connectionStatus: 'error' }));
        setLoading(false);
      }
    }, 5000); // Poll every 5 seconds
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      dir="rtl"
      lang="ar"
    >
      <div
        className="bg-background border-border relative w-full max-w-3xl rounded-lg border p-6 shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-foreground text-2xl font-bold">إعدادات واتساب</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={24} weight="bold" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive mb-4 flex items-center gap-2 rounded-lg border p-3">
            <WarningCircle size={20} weight="bold" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 mb-4 flex items-center gap-2 rounded-lg border p-3">
            <CheckCircle size={20} weight="bold" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">حالة الاتصال:</span>
              <span
                className={`text-sm font-bold ${
                  config.connectionStatus === 'connected'
                    ? 'text-green-600 dark:text-green-400'
                    : config.connectionStatus === 'connecting'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : config.connectionStatus === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                }`}
              >
                {config.connectionStatus === 'connected'
                  ? 'متصل'
                  : config.connectionStatus === 'connecting'
                    ? 'جاري الاتصال...'
                    : config.connectionStatus === 'error'
                      ? 'خطأ'
                      : 'غير متصل'}
              </span>
            </div>
            {config.connectionStatus === 'connecting' && (
              <div className="mt-4">
                <p className="text-muted-foreground mb-4 text-sm font-medium text-center">
                  يرجى مسح رمز QR من تطبيق واتساب على هاتفك
                </p>
                {qrCode ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="bg-white p-4 rounded-lg border-2 border-primary/20 shadow-lg">
                      <Image
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        width={256}
                        height={256}
                        className="object-contain"
                        style={{ imageRendering: 'crisp-edges' }}
                        onLoad={() => console.log('✅ QR Code image loaded successfully')}
                        onError={(e) => {
                          console.error('❌ QR Code image failed to load:', e);
                          setQrCode(null);
                        }}
                        unoptimized
                      />
                    </div>
                    <p className="text-muted-foreground text-xs text-center max-w-md">
                      افتح واتساب على هاتفك → الإعدادات → الأجهزة المرتبطة → ربط جهاز → امسح الرمز
                    </p>
                    <p className="text-green-600 dark:text-green-400 text-xs text-center font-medium">
                      ✓ رمز QR جاهز للمسح
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="bg-muted flex h-64 w-64 items-center justify-center rounded-lg border-2 border-dashed">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground text-sm mt-2">جاري تحميل رمز QR...</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs text-center">
                      يرجى الانتظار بينما يتم إنشاء رمز QR
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Phone Number */}
        <div className="mb-4">
          <label htmlFor="phone-number" className="mb-2 block text-sm font-medium">
            رقم واتساب <span className="text-muted-foreground text-xs">(اختياري)</span>
          </label>
          <input
            id="phone-number"
            type="text"
            value={config.phoneNumber}
            onChange={(e) => setConfig((prev) => ({ ...prev, phoneNumber: e.target.value }))}
            placeholder="مثال: +201030101482 (اختياري - يمكن الاتصال برمز QR فقط)"
            className="bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none"
            disabled={loading || config.connectionStatus === 'connected'}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            رقم واتساب الوكيل الذي سيتم ربطه مع النظام (اختياري - يمكنك الاتصال برمز QR فقط)
          </p>
        </div>

        {/* System Prompt */}
        <div className="mb-6">
          <label htmlFor="system-prompt" className="mb-2 block text-sm font-medium">
            System Prompt لواتساب
          </label>
          <textarea
            id="system-prompt"
            value={config.systemPrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
            placeholder="أدخل System Prompt مخصص لواتساب (اختياري)"
            rows={6}
            className="bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none"
            disabled={loading}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            System Prompt مخصص لردود واتساب. إذا تركت فارغاً، سيتم استخدام System Prompt الافتراضي
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={loading}
          >
            حفظ الإعدادات
          </Button>
          {config.connectionStatus === 'disconnected' || config.connectionStatus === 'error' ? (
            <Button
              variant="primary"
              onClick={handleConnect}
              disabled={loading || config.connectionStatus === 'connecting'}
            >
              {loading ? 'جاري الاتصال...' : 'اتصال'}
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
              قطع الاتصال
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

