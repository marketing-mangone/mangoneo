#!/bin/bash
set -e

echo "==> PORT=$PORT"
echo "==> DATABASE_URL presente: $([ -n "$DATABASE_URL" ] && echo SI || echo NO)"

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py ensure_superuser
python manage.py seed_youtube_metrics
python manage.py sync_youtube --weeks 12 || echo "==> sync_youtube falló, continuando..."
echo "==> Iniciando gunicorn en puerto ${PORT:-8000}"
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
