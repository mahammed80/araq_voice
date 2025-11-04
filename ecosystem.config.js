module.exports = {
  apps: [
    {
      name: 'araq-frontend',
      script: 'server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NODE_PORT: 3001,
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
        LIVEKIT_URL: process.env.LIVEKIT_URL || '',
      },
      env_production: {
        NODE_ENV: 'production',
        NODE_PORT: 3001,
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
        LIVEKIT_URL: process.env.LIVEKIT_URL || '',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
    },
  ],
};
