#!/usr/bin/env bash
#
# 서버에서 실행하는 배포 스크립트.
#
#   cd /srv/to-do-list-rpg && ./scripts/deploy.sh
#
# 순서가 중요하다: 빌드가 깨지면 마이그레이션도, 재시작도 하지 않는다.
# 이미 돌고 있는 구버전이 계속 서비스한다.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE="to-do-list-rpg"
ENV_FILE="/etc/${SERVICE}.env"
# deploy/to-do-list-rpg.service 의 ExecStart(또는 ecosystem.config.js 의 args)에 있는 -p 값과 같아야 한다.
APP_PORT=3000

# 프로세스 관리자: systemd(기본) | pm2
#   PROCESS_MANAGER=pm2 ./scripts/deploy.sh
PROCESS_MANAGER="${PROCESS_MANAGER:-systemd}"

cd "$APP_DIR"

echo "▶ 1/5 코드 받기"
git pull --ff-only

echo "▶ 2/5 의존성 설치"
# --omit=dev 를 쓰지 않는다: next build 에 typescript/tailwind 가, db:migrate 에 tsx 가 필요하다.
npm ci

echo "▶ 3/5 빌드"
# 여기서 실패하면 set -e 로 멈춘다 — 구버전이 계속 살아있다.
npm run build

echo "▶ 4/5 마이그레이션"
# systemd 가 아니라 이 셸에서 도는 스크립트라 환경변수를 직접 넣어준다.
# EnvironmentFile 과 같은 파일을 읽어서 두 곳이 갈라지지 않게 한다.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
npm run db:migrate

echo "▶ 5/5 재시작 (${PROCESS_MANAGER})"
case "$PROCESS_MANAGER" in
  systemd)
    sudo systemctl restart "$SERVICE"
    ;;
  pm2)
    # --update-env 가 없으면 PM2 가 옛 환경변수를 그대로 물려준다 (실측 확인).
    # 위에서 source 한 값이 반영되지 않아 "env 를 고쳤는데 왜 안 바뀌지" 로 이어진다.
    pm2 reload "$SERVICE" --update-env
    # 재부팅 후 복원되는 스냅샷도 갱신한다
    pm2 save --force
    ;;
  *)
    echo "PROCESS_MANAGER 는 systemd 또는 pm2 여야 합니다 (받은 값: ${PROCESS_MANAGER})" >&2
    exit 1
    ;;
esac

# 재시작 직후 바로 끝내면 부팅 실패를 놓친다. 실제로 응답하는지 확인한다.
echo -n "   기동 대기"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${APP_PORT}/signin"; then
    echo
    echo "✅ 배포 완료 — $(git rev-parse --short HEAD)"
    exit 0
  fi
  echo -n "."
  sleep 1
done

echo
echo "❌ 30초 안에 응답하지 않습니다. 로그를 확인하세요:"
if [ "$PROCESS_MANAGER" = "pm2" ]; then
  echo "   pm2 logs ${SERVICE} --lines 50"
else
  echo "   sudo journalctl -u ${SERVICE} -n 50 --no-pager"
fi
exit 1
