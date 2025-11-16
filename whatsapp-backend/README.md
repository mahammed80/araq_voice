# WhatsApp Backend Service

This is a separate backend service for WhatsApp integration that runs independently from the Next.js frontend.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your settings:
- `WHATSAPP_BACKEND_PORT`: Port for this service (default: 3002)
- `GROQ_API_URL`: URL to your Next.js frontend chat API (default: http://localhost:3000/api/chat)

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/config` - Get WhatsApp configuration
- `POST /api/config` - Update WhatsApp configuration
- `POST /api/connect` - Connect to WhatsApp
- `POST /api/disconnect` - Disconnect from WhatsApp
- `GET /api/status` - Get connection status
- `GET /api/qrcode` - Get QR code for connection

## Notes

- This service uses Puppeteer to control WhatsApp Web
- Make sure Chrome/Chromium is installed on your server
- The service stores session data in `./tokens/whatsapp-session/`
- Configuration is stored in `.whatsapp-config.json`

