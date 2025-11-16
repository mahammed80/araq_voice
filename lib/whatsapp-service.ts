import { create, Whatsapp, SocketState } from '@wppconnect-team/wppconnect';
import fs from 'fs';
import path from 'path';

interface WhatsAppConfig {
  phoneNumber: string;
  systemPrompt: string;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

let whatsappClient: Whatsapp | null = null;
let config: WhatsAppConfig = {
  phoneNumber: '',
  systemPrompt: '',
  isConnected: false,
  connectionStatus: 'disconnected',
};
let qrCode: string | null = null;

const CONFIG_FILE = path.join(process.cwd(), '.whatsapp-config.json');

// Load config from file
function loadConfig(): WhatsAppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      config = { ...config, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading WhatsApp config:', error);
  }
  return config;
}

// Save config to file
function saveConfig(newConfig: Partial<WhatsAppConfig>) {
  config = { ...config, ...newConfig };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving WhatsApp config:', error);
  }
}

// Initialize WhatsApp client
export async function connectWhatsApp(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
  try {
    if (whatsappClient) {
      return { success: false, error: 'Already connected or connecting' };
    }

    // Phone number is optional - can connect with just QR code
    saveConfig({ connectionStatus: 'connecting' });
    qrCode = null; // Clear any previous QR code

    console.log('Initializing WhatsApp connection...');
    
    whatsappClient = await create({
      session: 'whatsapp-session',
      catchQR: (base64Qr, asciiQR) => {
        console.log('catchQR callback triggered - QR code generation started');
        // Ensure QR code has proper data URL format
        if (base64Qr) {
          qrCode = base64Qr.startsWith('data:image') ? base64Qr : `data:image/png;base64,${base64Qr}`;
          console.log('✅ QR Code received and stored successfully!');
          console.log('QR Code length:', qrCode.length);
          console.log('QR Code preview:', qrCode.substring(0, 50) + '...');
        } else {
          console.warn('⚠️ QR Code received but is empty or null');
        }
      },
      statusFind: (statusSession, session) => {
        console.log('Status Session: ', statusSession);
        console.log('Session name: ', session);
        // Update connection status based on session status
        if (statusSession === 'isLogged') {
          saveConfig({ isConnected: true, connectionStatus: 'connected' });
          qrCode = null;
        } else if (statusSession === 'notLogged') {
          saveConfig({ connectionStatus: 'disconnected' });
        } else if (statusSession === 'qrReadSuccess') {
          // QR code was scanned successfully
          console.log('QR code scanned successfully');
        }
      },
      autoClose: 0,
      puppeteerOptions: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // Listen for connection state changes
    whatsappClient.onStateChange((state) => {
      console.log('WhatsApp state changed:', state);
      if (state === SocketState.CONNECTED) {
        console.log('WhatsApp connected successfully');
        saveConfig({ isConnected: true, connectionStatus: 'connected' });
        qrCode = null; // Clear QR code when connected
      } else if (state === SocketState.DISCONNECTED) {
        console.log('WhatsApp disconnected');
        saveConfig({ isConnected: false, connectionStatus: 'disconnected' });
        whatsappClient = null;
        qrCode = null;
      } else if (state === SocketState.CONNECTING) {
        console.log('WhatsApp is connecting, waiting for QR code...');
        saveConfig({ connectionStatus: 'connecting' });
      }
    });

    console.log('✅ WhatsApp client created successfully');
    console.log('⏳ Waiting for QR code to be generated (this may take 10-30 seconds)...');
    console.log('💡 The QR code will appear automatically when ready. Frontend is polling every 2 seconds.');

    // Set up message handler
    whatsappClient.onMessage(async (message) => {
      // Ignore messages sent by the bot
      if (message.fromMe) return;

      // Ignore group messages - groups have @g.us in the chat ID
      if (message.from && message.from.includes('@g.us')) {
        return;
      }

      // Ignore group messages using chat object if available
      if ((message as any).chat?.isGroup) {
        return;
      }

      // Ignore status updates
      if (message.isStatus || message.type === 'status' || message.type === 'statusV3') {
        return;
      }

      // Only process direct chat messages (not groups or status)
      // Direct chats have phone numbers in the format: 1234567890@c.us
      if (!message.from || !message.from.includes('@c.us')) {
        return;
      }

      try {
        // Get the system prompt for WhatsApp
        const currentConfig = loadConfig();
        const systemPrompt = currentConfig.systemPrompt || '';

        // Use internal server URL for server-side API calls
        // This calls the Groq endpoint through our /api/chat route
        // For server-side, use localhost with the port from environment or default
        const port = process.env.PORT || '3000';
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                       process.env.BASE_URL || 
                       `http://localhost:${port}`;
        
        const apiUrl = `${baseUrl}/api/chat`;
        console.log('Calling Groq API endpoint via /api/chat:', apiUrl);

        // Call the chat API (which uses Groq) to generate a response
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: message.body,
              },
            ],
            system_prompt: systemPrompt,
            use_rag_data: true,
            model: 'llama-3.1-8b-instant', // Use Groq model
            temperature: 1,
            max_completion_tokens: 1024,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Groq API error response:', response.status, errorText);
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        // Read streaming response from Groq
        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') break;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullContent += parsed.content;
                  }
                } catch (parseError) {
                  // Ignore JSON parse errors for malformed chunks
                  console.warn('Failed to parse chunk:', parseError);
                }
              }
            }
          }
        }

        // Send response back to WhatsApp using Groq's generated content
        if (fullContent && fullContent.trim() && whatsappClient) {
          console.log('Sending Groq response to WhatsApp:', fullContent.substring(0, 100) + '...');
          await whatsappClient.sendText(message.from, fullContent.trim());
        } else {
          console.warn('No content received from Groq API');
          if (whatsappClient) {
            await whatsappClient.sendText(
              message.from,
              'عذراً، لم أتمكن من معالجة رسالتك. يرجى المحاولة مرة أخرى.'
            );
          }
        }
      } catch (error) {
        console.error('Error handling WhatsApp message with Groq:', error);
        if (whatsappClient) {
          await whatsappClient.sendText(
            message.from,
            'عذراً، حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى.'
          );
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error connecting WhatsApp:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Check if it's a Puppeteer/Chrome related error
    if (error instanceof Error) {
      if (error.message.includes('Chrome') || error.message.includes('chromium') || error.message.includes('puppeteer')) {
        console.error('⚠️ Puppeteer/Chrome error detected. Make sure Chrome/Chromium is installed on the server.');
        console.error('💡 On Linux, you may need to install: sudo apt-get install -y chromium-browser');
        console.error('💡 Or set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false and install Chrome manually');
      }
    }
    
    saveConfig({ connectionStatus: 'error' });
    whatsappClient = null;
    qrCode = null;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Disconnect WhatsApp
export async function disconnectWhatsApp(): Promise<{ success: boolean; error?: string }> {
  try {
    if (whatsappClient) {
      await whatsappClient.logout();
      whatsappClient = null;
    }
    saveConfig({ isConnected: false, connectionStatus: 'disconnected' });
    qrCode = null;
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get connection status
export function getStatus(): { status: string; isConnected: boolean } {
  const currentConfig = loadConfig();
  return {
    status: currentConfig.connectionStatus,
    isConnected: currentConfig.isConnected,
  };
}

// Get config
export function getConfig(): WhatsAppConfig {
  return loadConfig();
}

// Update config
export function updateConfig(newConfig: Partial<WhatsAppConfig>): WhatsAppConfig {
  saveConfig(newConfig);
  return loadConfig();
}

// Get QR code
export function getQRCode(): string | null {
  return qrCode;
}

// Clear QR code
export function clearQRCode() {
  qrCode = null;
}

