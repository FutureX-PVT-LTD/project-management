#!/usr/bin/env bash
# Read-only diagnostics. Do not dump .env, PM2 environment, cookies or credentials.
set -u
cd /var/www/project-management || exit 1
printf '\nProcess status\n'
pm2 list
printf '\nBackend health on configured upstream port\n'
curl --max-time 10 --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' http://127.0.0.1:5040/api/v1/health
printf '\nFrontend health\n'
curl --max-time 10 --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' http://127.0.0.1:3040/login
printf '\nFrontend-to-API proxy health\n'
curl --max-time 10 --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' http://127.0.0.1:3040/api/v1/health
printf '\nProduction settings and database schema\n'
(cd backend && node scripts/check-production.cjs)
printf '\nListener addresses\n'
ss -lnt | awk 'NR == 1 || /:(5040|3040|5432|6379|443|80) /'
