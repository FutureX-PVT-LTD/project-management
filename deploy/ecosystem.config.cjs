module.exports = {
  apps: [
    { name: 'project-management-api', cwd: '/var/www/project-management/backend', script: 'dist/main.js',
      env_production: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '5040', TRUST_PROXY: 'loopback' } },
    { name: 'project-management-frontend', cwd: '/var/www/project-management/frontend', script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3040 -H 127.0.0.1', env_production: { NODE_ENV: 'production', API_URL: 'http://127.0.0.1:5040' } },
  ],
};
