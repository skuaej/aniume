module.exports = {
  apps: [
    {
      name: 'mizofy-api',
      script: 'backend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8000
      }
    },
    {
      name: 'vj-forward-bot',
      script: 'bot.py',
      cwd: 'backend/vj_bot',
      interpreter: 'python3',
      autorestart: true,
      env: {
        PYTHONPATH: '.'
      }
    }
  ]
};
