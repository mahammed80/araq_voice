# Deployment Guide for AraQ Website

This guide will help you deploy the AraQ Next.js frontend to your VPS server and run it on your domain.

## Prerequisites

- Node.js and npm/pnpm installed on your VPS
- PM2 installed globally: `npm install -g pm2`
- Your domain pointing to your VPS IP
- Nginx or Apache configured as reverse proxy (recommended)

## Deployment Steps

### 1. Build the Next.js Application

First, ensure you're in the `araq_react` directory and build the production version:

```bash
cd ~/htdocs/araq.ai/araq_react  # or your actual path
pnpm install  # or npm install if using npm
pnpm build    # or npm run build
```

This creates an optimized production build in the `.next` directory.

### 2. Set Up Environment Variables

Create a `.env.production` file (or set environment variables in your PM2 config) with your LiveKit credentials:

```env
LIVEKIT_URL=your-livekit-url
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
PORT=3000
NODE_ENV=production
```

### 3. Create Logs Directory

Create a logs directory for PM2:

```bash
mkdir -p logs
```

### 4. Start with PM2

Use the ecosystem config file to start the application:

```bash
pm2 start ecosystem.config.js
```

Or start it manually:

```bash
pm2 start npm --name "araq-frontend" -- start
```

### 5. Configure Reverse Proxy (Nginx)

Your Nginx configuration should proxy requests to the Next.js app running on port 3000:

```nginx
server {
    listen 80;
    server_name araq.ai www.araq.ai;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

After updating Nginx config, reload it:

```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload Nginx
```

### 6. Save PM2 Process List

To ensure PM2 starts your apps on server reboot:

```bash
pm2 save
pm2 startup  # Follow the instructions shown
```

## PM2 Management Commands

- **View status**: `pm2 status`
- **View logs**: `pm2 logs araq-frontend`
- **Restart**: `pm2 restart araq-frontend`
- **Stop**: `pm2 stop araq-frontend`
- **Delete**: `pm2 delete araq-frontend`
- **Monitor**: `pm2 monit`

## Troubleshooting

### Application not accessible on domain

1. Check if the app is running: `pm2 status`
2. Check if the port is correct: `netstat -tulpn | grep 3000`
3. Check Nginx/Apache reverse proxy configuration
4. Check firewall rules: `sudo ufw status`
5. Check logs: `pm2 logs araq-frontend --lines 50`

### Port already in use

If port 3000 is already in use, change the PORT in `ecosystem.config.js` and update your reverse proxy accordingly.

### Build errors

Ensure all dependencies are installed:
```bash
pnpm install
# or
npm install
```

## Current Setup

You should have both services running:
- `araq-voice` - Python backend agent
- `araq-frontend` - Next.js frontend application

Check with: `pm2 list`

