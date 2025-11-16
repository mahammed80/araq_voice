# WhatsApp Backend Setup Guide

The WhatsApp integration has been separated into a standalone backend service that runs independently from the Next.js frontend.

## Architecture

- **Next.js Frontend**: Runs on port 3000 (or configured port)
- **WhatsApp Backend**: Runs on port 3002 (configurable)

## Setup Instructions

### 1. Install WhatsApp Backend Dependencies

```bash
cd whatsapp-backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `whatsapp-backend` directory:

```env
# WhatsApp Backend Port
WHATSAPP_BACKEND_PORT=3002

# Groq API URL (from Next.js frontend)
GROQ_API_URL=http://localhost:3000/api/chat
```

### 3. Configure Next.js Frontend

Add to your Next.js `.env.local` or `.env`:

```env
# WhatsApp Backend URL
NEXT_PUBLIC_WHATSAPP_BACKEND_URL=http://localhost:3002
```

### 4. Start the Services

#### Terminal 1 - Next.js Frontend:
```bash
npm run dev
```

#### Terminal 2 - WhatsApp Backend:
```bash
cd whatsapp-backend
npm start
```

For development with auto-reload:
```bash
cd whatsapp-backend
npm run dev
```

## API Endpoints

The WhatsApp backend provides these endpoints:

- `GET /health` - Health check
- `GET /api/config` - Get WhatsApp configuration
- `POST /api/config` - Update WhatsApp configuration
- `POST /api/connect` - Connect to WhatsApp
- `POST /api/disconnect` - Disconnect from WhatsApp
- `GET /api/status` - Get connection status
- `GET /api/qrcode` - Get QR code for connection

## Production Deployment

### Using PM2

Create a PM2 ecosystem file for the WhatsApp backend:

```javascript
// whatsapp-backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'whatsapp-backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      WHATSAPP_BACKEND_PORT: 3002,
      GROQ_API_URL: 'http://localhost:3000/api/chat'
    }
  }]
};
```

Start with PM2:
```bash
cd whatsapp-backend
pm2 start ecosystem.config.js
pm2 save
```

### Using systemd (Linux)

Create a systemd service file:

```ini
[Unit]
Description=WhatsApp Backend Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/araq_voice/whatsapp-backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production
Environment=WHATSAPP_BACKEND_PORT=3002
Environment=GROQ_API_URL=http://localhost:3000/api/chat

[Install]
WantedBy=multi-user.target
```

## Benefits of Separate Backend

1. **Independent Scaling**: WhatsApp backend can be scaled separately
2. **Better Resource Management**: Puppeteer/Chrome runs in isolated process
3. **Easier Deployment**: Can deploy backend on different server if needed
4. **Better Error Isolation**: Backend crashes don't affect frontend
5. **Continuous Operation**: Backend can run 24/7 independently

## Troubleshooting

### Backend won't start
- Check if port 3002 is available
- Verify Chrome/Chromium is installed
- Check `.env` file configuration

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_WHATSAPP_BACKEND_URL` is set correctly
- Check CORS settings (should be enabled by default)
- Ensure backend is running

### QR code not generating
- Check backend console logs
- Verify Puppeteer can launch Chrome
- Check disk space for session storage

