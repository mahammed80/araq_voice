import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getStatus,
  getConfig,
  updateConfig,
  getQRCode,
} from './whatsapp-service.js';

dotenv.config();

const app = express();
const PORT = process.env.WHATSAPP_BACKEND_PORT || 3002;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-backend' });
});

// Get config
app.get('/api/config', (req, res) => {
  try {
    const config = getConfig();
    res.json({
      phoneNumber: config.phoneNumber || '',
      systemPrompt: config.systemPrompt || '',
      isConnected: config.isConnected || false,
      connectionStatus: config.connectionStatus || 'disconnected',
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.json({
      phoneNumber: '',
      systemPrompt: '',
      isConnected: false,
      connectionStatus: 'disconnected',
    });
  }
});

// Update config
app.post('/api/config', (req, res) => {
  try {
    const { phoneNumber, systemPrompt } = req.body;
    const updatedConfig = updateConfig({
      phoneNumber: phoneNumber || '',
      systemPrompt: systemPrompt || '',
    });
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Connect WhatsApp
app.post('/api/connect', async (req, res) => {
  try {
    console.log('📞 Connect API called');
    const groqApiUrl = process.env.GROQ_API_URL || 'http://localhost:3000/api/chat';
    console.log('   Groq API URL:', groqApiUrl);
    
    const result = await connectWhatsApp(groqApiUrl);
    
    if (result.success) {
      console.log('✅ Connection initiated successfully');
      // Get updated config to return current status
      const currentConfig = getConfig();
      res.json({ 
        success: true, 
        message: 'Connection initiated',
        connectionStatus: currentConfig.connectionStatus || 'connecting'
      });
    } else {
      console.error('❌ Connection failed:', result.error);
      res.status(400).json({ error: result.error || 'Failed to connect' });
    }
  } catch (error) {
    console.error('❌ Error connecting WhatsApp:', error);
    res.status(500).json({ error: 'Failed to connect WhatsApp' });
  }
});

// Disconnect WhatsApp
app.post('/api/disconnect', async (req, res) => {
  try {
    const { disconnectWhatsApp, cleanupBrowser } = await import('./whatsapp-service.js');
    const result = await disconnectWhatsApp();
    // Also cleanup browser to prevent "already running" errors
    await cleanupBrowser();
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error || 'Failed to disconnect' });
    }
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({ error: 'Failed to disconnect WhatsApp' });
  }
});

// Cleanup endpoint (useful for fixing "browser already running" errors)
app.post('/api/cleanup', async (req, res) => {
  try {
    const { cleanupBrowser } = await import('./whatsapp-service.js');
    await cleanupBrowser();
    res.json({ success: true, message: 'Browser cleanup completed' });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup browser' });
  }
});

// Get status
app.get('/api/status', (req, res) => {
  try {
    const status = getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Get QR code
app.get('/api/qrcode', (req, res) => {
  try {
    const qrCode = getQRCode();
    console.log('📱 QR Code API called, QR code available:', !!qrCode);
    if (qrCode) {
      console.log('✅ Returning QR code to frontend');
      console.log('   QR code length:', qrCode.length);
      console.log('   QR code starts with:', qrCode.substring(0, 30));
      console.log('   QR code format:', qrCode.startsWith('data:image') ? 'data URL' : 'base64');
      res.json({ qrCode });
    } else {
      console.log('⏳ No QR code available yet');
      res.json({ qrCode: null });
    }
  } catch (error) {
    console.error('❌ Error fetching QR code:', error);
    res.status(500).json({ error: 'Failed to fetch QR code', qrCode: null });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 WhatsApp Backend Service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
  
  // Auto-restore session on startup
  try {
    const groqApiUrl = process.env.GROQ_API_URL || 'http://localhost:3000/api/chat';
    const { initializeSession } = await import('./whatsapp-service.js');
    console.log('\n🔄 Checking for existing WhatsApp session...');
    const result = await initializeSession(groqApiUrl);
    
    if (result.connected) {
      console.log('✅ WhatsApp session restored - user is already logged in!');
      console.log('💡 No QR code scan needed - ready to receive messages');
      console.log('💡 User can use WhatsApp immediately without logging in again');
    } else if (result.hasSession) {
      console.log('⚠️ Session folder exists but requires QR code scan');
      console.log('💡 User will need to scan QR code when they connect');
    } else {
      console.log('📝 No saved session - user will need to scan QR code on first connect');
      console.log('💡 After first scan, session will be saved for future use');
    }
  } catch (error) {
    console.error('⚠️ Error during session restoration:', error.message);
    console.log('💡 Session will be restored when user clicks "Connect"');
  }
});

