#!/usr/bin/env bash
#
# 서버에서 실행하는 배포 스크립트.
#
#   cd /var/www/to-do-list-rpg && ./scripts/deploy.sh
#
# 순서가 중요하다: 빌드가 깨지면 마이그레이션도, 재시작도 하지 않는다.
# 이미 돌고 있는 구버전이 계속 서비스한다.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE="to-do-list-rpg"
# 앱 디렉토리의 .env 가 유일한 기준이다. gitignore 되어 있어 git pull 로 덮이지 않는다.
ENV_FILE="${APP_DIR}/.env"
# ecosystem.config.js 의 -p 값, deploy/nginx.conf 의 upstream 과 반드시 같아야 한다.
# 3000 은 같은 서버의 다른 Next 앱(my-btc-trading)이 쓰고 있다.
APP_PORT=3002

cd "$APP_DIR"

# node 가 nvm 아래에만 있어서, ssh 로 비대화형 실행하면 PATH 에 없다 (nvm 초기화는 .bashrc 에
# 있는데 그건 대화형 셸에서만 읽힌다). 그대로 두면 npm 부터 "command not found" 로 깨진다.
if ! command -v node >/dev/null 2>&1; then
  # nvm.sh 는 미설정 변수를 건드리므로 set -u 를 잠시 끈다
  set +u
  # shellcheck disable=SC1090
  [ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"
  set -u
fi
command -v node >/dev/null 2>&1 || {
  echo "node 를 찾을 수 없습니다. nvm 설치를 확인하세요." >&2
  exit 1
}

echo "▶ 1/5 코드 받기"
git pull --ff-only

echo "▶ 2/5 의존성 설치"
# --omit=dev 를 쓰지 않는다: next build 에 typescript/tailwind 가, db:migrate 에 tsx 가 필요하다.
npm ci

echo "▶ 3/5 빌드"
# 여기서 실패하면 set -e 로 멈춘다 — 구버전이 계속 살아있다.
npm run build

echo "▶ 4/5 마이그레이션"
# db:migrate 는 .env.local 만 읽는다 — 서버의 .env 는 스스로 읽지 않으므로 여기서 셸에 올려준다.
# PM2 도 start 시점의 셸 환경을 물려받으므로 같은 파일을 쓴다.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
npm run db:migrate

echo "▶ 5/5 재시작"
# --update-env 가 없으면 PM2 가 옛 환경변수를 그대로 물려준다 (실측 확인).
# 위에서 source 한 값이 반영되지 않아 "env 를 고쳤는데 왜 안 바뀌지" 로 이어진다.
pm2 reload "$SERVICE" --update-env
# 재부팅 후 복원되는 스냅샷도 갱신한다
pm2 save --force

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
echo "   pm2 logs ${SERVICE} --lines 50"
exit 1
