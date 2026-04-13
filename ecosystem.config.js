module.exports = {
  apps: [
    {
      name: 'mizofy-api',
      // server.js is now directly in /app (the WORKDIR)
      script: 'server.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8000
      }
    },
    {
      name: 'vj-forward-bot',
      script: 'bot.py',
      // bot files are in /app/vj_bot/
      cwd: '/app/vj_bot',
      interpreter: 'python3',
      autorestart: true,
      watch: false,
      env: {
        PYTHONPATH: '/app/vj_bot'
      }
    }
  ]
};
