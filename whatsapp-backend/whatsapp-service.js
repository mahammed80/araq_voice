import { create } from '@wppconnect-team/wppconnect';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let whatsappClient = null;
let config = {
  phoneNumber: '',
  systemPrompt: '',
  isConnected: false,
  connectionStatus: 'disconnected',
};
let qrCode = null;

const CONFIG_FILE = path.join(__dirname, '.whatsapp-config.json');

// Load config from file
function loadConfig() {
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
function saveConfig(newConfig) {
  config = { ...config, ...newConfig };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving WhatsApp config:', error);
  }
}

// Cleanup function to disconnect and clear browser
export async function cleanupBrowser() {
  try {
    if (whatsappClient) {
      console.log('Cleaning up existing WhatsApp client...');
      try {
        await whatsappClient.logout();
      } catch (err) {
        console.warn('Error during logout:', err.message);
      }
      whatsappClient = null;
    }
    qrCode = null;
    saveConfig({ connectionStatus: 'disconnected', isConnected: false });
    console.log('✅ Browser cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Check if session exists
function checkSessionExists() {
  const sessionPath = path.join(__dirname, 'tokens', 'whatsapp-session');
  return fs.existsSync(sessionPath);
}

// Restore session on startup (auto-connect if session exists)
export async function restoreSession(groqApiUrl) {
  try {
    if (whatsappClient) {
      console.log('⚠️ WhatsApp client already exists, skipping restoration');
      return { success: true, restored: false };
    }

    const hasSession = checkSessionExists();
    if (!hasSession) {
      console.log('📝 No existing session found - user will need to scan QR code');
      return { success: true, restored: false, needsQR: true };
    }

    console.log('🔄 Restoring WhatsApp session from saved tokens...');
    saveConfig({ connectionStatus: 'connecting' });

    whatsappClient = await create({
      session: 'whatsapp-session',
      catchQR: (base64Qr, asciiQR) => {
        // QR code only needed if session is invalid
        if (base64Qr) {
          qrCode = base64Qr.startsWith('data:image') ? base64Qr : `data:image/png;base64,${base64Qr}`;
          console.log('⚠️ QR Code required - session may have expired');
        }
      },
      statusFind: (statusSession, session) => {
        console.log('Status Session:', statusSession);
        if (statusSession === 'isLogged') {
          console.log('✅ Session restored successfully - user is logged in!');
          saveConfig({ isConnected: true, connectionStatus: 'connected' });
          qrCode = null;
        } else if (statusSession === 'notLogged') {
          console.log('⚠️ Session exists but not logged in - QR code required');
          saveConfig({ connectionStatus: 'connecting' });
        } else if (statusSession === 'desconnectedMobile') {
          console.log('📱 Mobile device disconnected');
          saveConfig({ connectionStatus: 'disconnected' });
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

    // Set up message handler
    whatsappClient.onMessage(async (message) => {
      if (message.fromMe) return;
      if (message.from && message.from.includes('@g.us')) return;
      if (message.chat?.isGroup) return;
      if (message.isStatus || message.type === 'status' || message.type === 'statusV3') return;
      if (!message.from || !message.from.includes('@c.us')) return;

      try {
        const currentConfig = loadConfig();
        const systemPrompt = currentConfig.systemPrompt || '';

        const response = await fetch(groqApiUrl, {
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
            model: 'llama-3.1-8b-instant',
            temperature: 1,
            max_completion_tokens: 1024,
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

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
                  console.warn('Failed to parse chunk:', parseError);
                }
              }
            }
          }
        }

        if (fullContent && fullContent.trim() && whatsappClient) {
          await whatsappClient.sendText(message.from, fullContent.trim());
        }
      } catch (error) {
        console.error('Error handling WhatsApp message:', error);
        if (whatsappClient) {
          await whatsappClient.sendText(
            message.from,
            'عذراً، حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى.'
          );
        }
      }
    });

    // Listen for connection state changes
    whatsappClient.onStateChange((state) => {
      console.log('WhatsApp state changed:', state);
      if (state === 'CONNECTED') {
        console.log('✅ WhatsApp connected successfully');
        saveConfig({ isConnected: true, connectionStatus: 'connected' });
        qrCode = null;
      } else if (state === 'DISCONNECTED') {
        console.log('WhatsApp disconnected');
        saveConfig({ isConnected: false, connectionStatus: 'disconnected' });
        whatsappClient = null;
        qrCode = null;
      } else if (state === 'CONNECTING') {
        console.log('WhatsApp is connecting...');
        saveConfig({ connectionStatus: 'connecting' });
      }
    });

    // Wait a moment to see if session is restored
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const currentConfig = loadConfig();
    if (currentConfig.connectionStatus === 'connected') {
      console.log('✅ Session restored - user is already logged in!');
      return { success: true, restored: true, connected: true };
    } else {
      console.log('⏳ Session restoration in progress or QR code needed');
      return { success: true, restored: true, connected: false };
    }
  } catch (error) {
    console.error('❌ Error restoring session:', error);
    whatsappClient = null;
    saveConfig({ connectionStatus: 'disconnected' });
    return { success: false, restored: false, error: error.message };
  }
}

// Initialize WhatsApp client with session restoration
export async function connectWhatsApp(groqApiUrl) {
  try {
    if (whatsappClient) {
      return { success: false, error: 'Already connected or connecting' };
    }

    // Check if session exists
    const hasSession = checkSessionExists();
    if (hasSession) {
      console.log('📂 Existing session found - attempting to restore...');
      saveConfig({ connectionStatus: 'connecting' });
    } else {
      console.log('📝 No existing session - will require QR code scan');
      saveConfig({ connectionStatus: 'connecting' });
    }
    
    qrCode = null;

    console.log('Initializing WhatsApp connection...');
    
    try {
      whatsappClient = await create({
        session: 'whatsapp-session',
        catchQR: (base64Qr, asciiQR) => {
          console.log('catchQR callback triggered - QR code generation started');
          if (base64Qr) {
            qrCode = base64Qr.startsWith('data:image') ? base64Qr : `data:image/png;base64,${base64Qr}`;
            console.log('✅ QR Code received and stored successfully!');
            console.log('QR Code length:', qrCode.length);
          } else {
            console.warn('⚠️ QR Code received but is empty or null');
          }
        },
        statusFind: (statusSession, session) => {
          console.log('Status Session:', statusSession);
          if (statusSession === 'isLogged') {
            console.log('✅ Session restored - user is already logged in!');
            saveConfig({ isConnected: true, connectionStatus: 'connected' });
            qrCode = null;
          } else if (statusSession === 'notLogged') {
            console.log('⚠️ Session exists but not logged in - QR code required');
            saveConfig({ connectionStatus: 'connecting' });
          } else if (statusSession === 'qrReadSuccess') {
            console.log('✅ QR code scanned successfully - session will be saved');
          } else if (statusSession === 'desconnectedMobile') {
            console.log('📱 Mobile device disconnected - session may need re-authentication');
            saveConfig({ connectionStatus: 'disconnected' });
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
    } catch (createError) {
      // Handle browser already running error
      if (createError.message && createError.message.includes('browser is already running')) {
        console.warn('⚠️ Browser is already running. Attempting cleanup...');
        await cleanupBrowser();
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try again
        console.log('🔄 Retrying connection after cleanup...');
        whatsappClient = await create({
          session: 'whatsapp-session',
          catchQR: (base64Qr, asciiQR) => {
            console.log('catchQR callback triggered - QR code generation started');
            if (base64Qr) {
              qrCode = base64Qr.startsWith('data:image') ? base64Qr : `data:image/png;base64,${base64Qr}`;
              console.log('✅ QR Code received and stored successfully!');
              console.log('QR Code length:', qrCode.length);
            } else {
              console.warn('⚠️ QR Code received but is empty or null');
            }
          },
          statusFind: (statusSession, session) => {
            console.log('Status Session:', statusSession);
            if (statusSession === 'isLogged') {
              console.log('✅ Session restored - user is already logged in!');
              saveConfig({ isConnected: true, connectionStatus: 'connected' });
              qrCode = null;
            } else if (statusSession === 'notLogged') {
              console.log('⚠️ Session exists but not logged in - QR code required');
              saveConfig({ connectionStatus: 'connecting' });
            } else if (statusSession === 'qrReadSuccess') {
              console.log('✅ QR code scanned successfully - session will be saved');
            } else if (statusSession === 'desconnectedMobile') {
              console.log('📱 Mobile device disconnected - session may need re-authentication');
              saveConfig({ connectionStatus: 'disconnected' });
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
      } else {
        throw createError; // Re-throw if it's a different error
      }
    }

    // Listen for connection state changes
    whatsappClient.onStateChange((state) => {
      console.log('WhatsApp state changed:', state);
      if (state === 'CONNECTED') {
        console.log('WhatsApp connected successfully');
        saveConfig({ isConnected: true, connectionStatus: 'connected' });
        qrCode = null;
      } else if (state === 'DISCONNECTED') {
        console.log('WhatsApp disconnected');
        saveConfig({ isConnected: false, connectionStatus: 'disconnected' });
        whatsappClient = null;
        qrCode = null;
      } else if (state === 'CONNECTING') {
        console.log('WhatsApp is connecting, waiting for QR code...');
        saveConfig({ connectionStatus: 'connecting' });
      }
    });

    console.log('✅ WhatsApp client created successfully');

    // Set up message handler
    whatsappClient.onMessage(async (message) => {
      if (message.fromMe) return;
      if (message.from && message.from.includes('@g.us')) return;
      if (message.chat?.isGroup) return;
      if (message.isStatus || message.type === 'status' || message.type === 'statusV3') return;
      if (!message.from || !message.from.includes('@c.us')) return;

      try {
        const currentConfig = loadConfig();
        const systemPrompt = currentConfig.systemPrompt || '';

        const response = await fetch(groqApiUrl, {
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
            model: 'llama-3.1-8b-instant',
            temperature: 1,
            max_completion_tokens: 1024,
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

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
                  console.warn('Failed to parse chunk:', parseError);
                }
              }
            }
          }
        }

        if (fullContent && fullContent.trim() && whatsappClient) {
          await whatsappClient.sendText(message.from, fullContent.trim());
        }
      } catch (error) {
        console.error('Error handling WhatsApp message:', error);
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
    
    // Check for browser already running error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('browser is already running') || errorMessage.includes('userDataDir')) {
      console.error('💡 Browser is already running. Attempting automatic cleanup...');
      try {
        await cleanupBrowser();
        console.log('✅ Cleanup completed. Please try connecting again.');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
        console.error('💡 Manual steps:');
        console.error('   1. Stop the backend service (Ctrl+C)');
        console.error('   2. Kill Chrome/Chromium processes');
        console.error('   3. Delete tokens/whatsapp-session folder (optional)');
        console.error('   4. Restart the backend service');
      }
    }
    
    saveConfig({ connectionStatus: 'error' });
    whatsappClient = null;
    qrCode = null;
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function disconnectWhatsApp() {
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

export function getStatus() {
  const currentConfig = loadConfig();
  return {
    status: currentConfig.connectionStatus,
    isConnected: currentConfig.isConnected,
  };
}

export function getConfig() {
  return loadConfig();
}

export function updateConfig(newConfig) {
  saveConfig(newConfig);
  return loadConfig();
}

export function getQRCode() {
  return qrCode;
}

export function clearQRCode() {
  qrCode = null;
}

// Initialize and restore session on startup (optional - can be called on server start)
export async function initializeSession(groqApiUrl) {
  try {
    // Check if session exists
    const hasSession = checkSessionExists();
    if (!hasSession) {
      console.log('📝 No existing session to restore');
      return { connected: false, hasSession: false };
    }

    console.log('🔄 Attempting to restore existing WhatsApp session...');
    
    // Don't create if already exists
    if (whatsappClient) {
      const currentConfig = loadConfig();
      return { 
        connected: currentConfig.isConnected, 
        hasSession: true 
      };
    }

    // Try to restore session
    whatsappClient = await create({
      session: 'whatsapp-session',
      catchQR: (base64Qr, asciiQR) => {
        // QR code only needed if session is invalid
        if (base64Qr) {
          qrCode = base64Qr.startsWith('data:image') ? base64Qr : `data:image/png;base64,${base64Qr}`;
          console.log('⚠️ QR Code required - session may have expired');
        }
      },
      statusFind: (statusSession, session) => {
        if (statusSession === 'isLogged') {
          console.log('✅ Session restored successfully - user is logged in!');
          saveConfig({ isConnected: true, connectionStatus: 'connected' });
          qrCode = null;
        } else if (statusSession === 'notLogged') {
          console.log('⚠️ Session exists but requires authentication');
          saveConfig({ connectionStatus: 'disconnected' });
        } else if (statusSession === 'desconnectedMobile') {
          console.log('📱 Mobile device disconnected');
          saveConfig({ connectionStatus: 'disconnected' });
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

    // Set up message handler for restored session
    whatsappClient.onMessage(async (message) => {
      if (message.fromMe) return;
      if (message.from && message.from.includes('@g.us')) return;
      if (message.chat?.isGroup) return;
      if (message.isStatus || message.type === 'status' || message.type === 'statusV3') return;
      if (!message.from || !message.from.includes('@c.us')) return;

      try {
        const currentConfig = loadConfig();
        const systemPrompt = currentConfig.systemPrompt || '';

        const response = await fetch(groqApiUrl, {
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
            model: 'llama-3.1-8b-instant',
            temperature: 1,
            max_completion_tokens: 1024,
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

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
                  console.warn('Failed to parse chunk:', parseError);
                }
              }
            }
          }
        }

        if (fullContent && fullContent.trim() && whatsappClient) {
          await whatsappClient.sendText(message.from, fullContent.trim());
        }
      } catch (error) {
        console.error('Error handling WhatsApp message:', error);
        if (whatsappClient) {
          await whatsappClient.sendText(
            message.from,
            'عذراً، حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى.'
          );
        }
      }
    });

    // Listen for connection state changes
    whatsappClient.onStateChange((state) => {
      console.log('WhatsApp state changed:', state);
      if (state === 'CONNECTED') {
        console.log('✅ WhatsApp connected successfully');
        saveConfig({ isConnected: true, connectionStatus: 'connected' });
        qrCode = null;
      } else if (state === 'DISCONNECTED') {
        console.log('WhatsApp disconnected');
        saveConfig({ isConnected: false, connectionStatus: 'disconnected' });
        whatsappClient = null;
        qrCode = null;
      } else if (state === 'CONNECTING') {
        console.log('WhatsApp is connecting...');
        saveConfig({ connectionStatus: 'connecting' });
      }
    });

    // Wait a moment to check connection status
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const currentConfig = loadConfig();
    if (currentConfig.connectionStatus === 'connected') {
      console.log('✅ Session restored - user is already logged in!');
      return { connected: true, hasSession: true };
    } else {
      console.log('⏳ Session restoration in progress or QR code needed');
      return { connected: false, hasSession: true };
    }
  } catch (error) {
    console.error('❌ Error restoring session:', error);
    whatsappClient = null;
    saveConfig({ connectionStatus: 'disconnected' });
    return { connected: false, hasSession: false, error: error.message };
  }
}

