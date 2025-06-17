#!/bin/bash

# rebuild.sh: Docker Compose 서비스를 다시 빌드하고, 오래된 이미지를 정리하는 스크립트

# 스크립트 실행 중 에러가 발생하면 즉시 중단합니다. (안전장치)
set -e

echo "🐳 1. Docker Compose 서비스를 다시 빌드하고 백그라운드에서 시작합니다..."
# --remove-orphans 옵션은 docker-compose.yml에서 제거된 서비스의 컨테이너를 삭제합니다.
docker compose up --build -d --remove-orphans

echo ""
echo "-----------------------------------------------------"
echo "✅ 서비스가 성공적으로 시작되었습니다. 현재 실행 중인 컨테이너:"
docker compose ps
echo "-----------------------------------------------------"
echo ""

echo "🧹 2. 사용하지 않는 이전 버전의 Docker 이미지를 정리합니다..."
docker image prune -f

echo ""
echo "✨ 모든 작업이 완료되었습니다! ✨"

