#!/usr/bin/env bash
# Ночной пересчёт агрегатов аналитики. Ставится в cron на VPS:
#   5 4 * * * /var/www/hr_platform/web/scripts/analytics-rollup.sh >> /var/log/analytics-rollup.log 2>&1
set -euo pipefail
docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "select public.analytics_rollup(3)"
echo "$(date --iso-8601=seconds) rollup ok"
