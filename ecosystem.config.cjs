// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'wlplay-blog',
      script: './server/dist/index.js',
      cwd: '/srv/wlplay',
      env: {
        PORT: 3010,
        DB_PATH: '/var/lib/wlplay-blog/blog.db',
        IMAGE_HOSTING_UPLOAD_URL: 'http://127.0.0.1:5000/upload',
        IMAGE_HOSTING_BASE_URL: 'https://image.wlplay.cn',
      },
      autorestart: true,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true,
    },
  ],
}
