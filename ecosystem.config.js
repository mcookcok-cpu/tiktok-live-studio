module.exports = {
  apps: [
    {
      name: 'tiktok-live-studio',
      script: 'backend/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 20,
      min_uptime: '10s',
      max_memory_restart: '400M',
      watch: false,
      time: true,
      merge_logs: true,
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 9003,
        AI_HOST_WS: 'ws://localhost:2027/ws'
      }
    }
  ]
};
