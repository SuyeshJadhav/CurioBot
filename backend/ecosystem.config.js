module.exports = {
  apps: [
    {
      name: 'curiobot-backend',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
