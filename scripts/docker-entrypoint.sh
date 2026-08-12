#!/bin/sh
set -e
echo "DB tayyorlanmoqda..."
npx prisma db push --skip-generate
echo "Ilova ishga tushmoqda..."
exec "$@"
