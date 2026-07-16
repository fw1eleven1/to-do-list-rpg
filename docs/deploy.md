# 배포 가이드

리눅스 VM 에 Node 로 직접 구동하는 기준. 앞에 Cloudflare 와 Nginx 를 둔다.

```
브라우저 ──https──▶ Cloudflare ──https(Full strict)──▶ Nginx:443 ──▶ 127.0.0.1:3002 (next start) ──▶ PostgreSQL 17 (localhost:5432)
```

## 지금 어디에 떠 있나

| | |
|---|---|
| 서버 | `js` (141.164.63.179, Vultr, Ubuntu 24.04) |
| 주소 | https://rpg.pjsk.kr (Cloudflare 프록시 뒤) |
| 앱 경로 | `/var/www/to-do-list-rpg` |
| 구동 | PM2 (`root`), Node 24 (nvm) |
| DB | 같은 서버의 PostgreSQL 17, localhost 전용 |
| TLS | Cloudflare Origin 인증서(2041 만료, 갱신 불필요) + SSL 모드 Full (strict) |

**이 서버에는 다른 앱이 이미 산다.** `my-btc-trading`(Next 16)이 **포트 3000** 과 **IP:80** 을
쓰고 있다. 그래서 이 앱은 **3002**(앱) 를 쓴다. Nginx 는 이름 기반 가상호스트로
`server_name rpg.pjsk.kr` 블록(443)을 따로 두어 btc 앱(80 default)과 공존한다. 포트를
3000 으로 되돌리면 두 앱이 같은 포트를 물어 한쪽이 계속 죽는다. 개발 서버가 3001 인 것도 같은 이유다.

포트를 바꾸려면 **세 곳을 같이** 고쳐야 한다:

| 파일 | 값 |
|---|---|
| `deploy/ecosystem.config.js` | `args` 의 `-p 3002` |
| `scripts/deploy.sh` | `APP_PORT=3002` |
| `deploy/nginx.conf` | `upstream rpg_app` 의 `server 127.0.0.1:3002` |

## 관련 파일

| 파일 | 용도 |
|---|---|
| `deploy/ecosystem.config.js` | PM2 설정 |
| `deploy/nginx.conf` | 리버스 프록시 |
| `deploy/env.production.example` | `/var/www/to-do-list-rpg/.env` 템플릿 |
| `scripts/deploy.sh` | 배포(받기 → 빌드 → 마이그레이션 → 재시작 → 헬스체크) |

## 준비물

- **Node 20.12 이상** (`package.json` 의 `engines`). Next 16 은 20.9+ 를 요구하지만 이 앱은
  `process.loadEnvFile` 을 써서 20.12 가 진짜 하한이다. 22 LTS 나 24 를 권한다.
- **PostgreSQL 17** (다른 메이저도 대체로 되지만 개발/검증은 17 로 했다)
- Nginx, git. (TLS 는 Cloudflare Origin 인증서를 쓰므로 certbot 은 필요 없다 — §6)

---

## 1. 서버 기본 설정

```bash
git clone https://github.com/fw1eleven1/to-do-list-rpg.git /var/www/to-do-list-rpg
```

> **clone URL 에 토큰을 넣지 말 것.** 이 저장소는 public 이라 토큰 없이 받아진다.
> `https://<토큰>@github.com/...` 형태로 clone 하면 토큰이 `.git/config` 에 평문으로 남아,
> 서버를 읽을 수 있는 누구나 가져갈 수 있다.

**이 앱은 `root` 로 돈다.** 문서상 권장은 아니다 — 원래는 `rpg` 전용 nologin 계정을 두는 게 맞다.
이 서버가 그렇게 안 된 이유는 **Node 가 root 의 nvm(`/root/.nvm`) 안에만 있어서** 다른 계정에서는
보이지 않기 때문이다. 계정을 분리하려면 먼저 시스템 전역 Node 를 깔아야 한다(NodeSource 등).

방화벽은 **80/443 만** 연다. 앱(3002)과 Postgres(5432)는 절대 밖으로 열지 않는다.

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'      # 80, 443
ufw enable
ufw status                  # 3002, 5432 가 없어야 정상
```

> **하드닝(선택):** 오리진은 Cloudflare 를 거치지 않고 IP:443 으로 직접 붙어도 응답한다
> (인증서가 Cloudflare Origin CA 라 브라우저는 경고를 띄우지만 TCP 는 열린다). 원한다면
> 80/443 을 Cloudflare IP 대역으로만 제한하거나, Cloudflare 의 Authenticated Origin Pull(mTLS)
> 을 켜서 CF 를 거치지 않은 연결을 오리진에서 거부할 수 있다.

## 2. DB 만들기

Ubuntu 24.04 기본 저장소에는 Postgres 16 까지만 있다. 17 은 PGDG 저장소를 붙여야 한다.

```bash
install -d /usr/share/postgresql-common/pgdg
curl -fsS -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt noble-pgdg main" > /etc/apt/sources.list.d/pgdg.list
apt-get update && apt-get install -y postgresql-17
```

```bash
# 비밀번호는 hex 로 만든다 — 아래 §3 의 이유로 # 이나 공백이 섞이면 안 된다
DB_PW=$(openssl rand -hex 24)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER rpg WITH PASSWORD '$DB_PW';
CREATE DATABASE rpg OWNER rpg;
SQL
echo "$DB_PW"     # .env 의 DATABASE_URL 에 넣을 것
```

`postgresql.conf` 의 `listen_addresses` 는 기본값(`localhost`)을 유지한다. 확인:

```bash
ss -tlnp | grep 5432        # 127.0.0.1:5432 여야 정상
```

DB 를 다른 서버에 둔다면 연결 문자열에 **반드시 `?sslmode=require`** 를 붙인다.
코드는 벤더 SDK 없이 `DATABASE_URL` 하나만 보므로, 관리형 DB 로 옮겨도 문자열만 바꾸면 된다.

## 3. 환경변수

**앱 디렉토리의 `.env` 가 유일한 기준이다.** `.gitignore` 가 `.env*` 를 무시하므로 `git pull` 로
덮이지 않는다.

```bash
cd /var/www/to-do-list-rpg
cp deploy/env.production.example .env
chmod 600 .env        # 안 하면 서버의 모든 사용자가 OpenAI 키를 읽는다
nano .env
```

반드시 확인할 것:

- **`AUTH_SECRET` 은 새로 만든다** — `openssl rand -base64 32`.
  개발용(`.env.local`)과 같은 값을 쓰면 개발 PC 가 털렸을 때 프로덕션 세션이 위조된다.
  **개발용 `.env.local` 을 서버로 복사해오는 것이 가장 흔한 실수다** — `AUTH_URL` 이 localhost 로,
  `AUTH_SECRET` 이 개발용 그대로 남는다.
- **`AUTH_URL`** 은 공개 주소, 뒤에 슬래시 없이. 지금은 `https://rpg.pjsk.kr`.
- **`AUTH_TRUST_HOST=true`** — 리버스 프록시(Cloudflare + Nginx) 뒤에서 도는 self-host 배포라
  필요하다. 없으면 NextAuth 가 `X-Forwarded-Proto` 를 믿지 않아 콜백 주소를 http 로 만든다.
- **Google 을 쓴다면** 콘솔의 승인된 리디렉션 URI 에
  `https://rpg.pjsk.kr/api/auth/callback/google` 를 추가한다. 개발용(`localhost:3001`)과 별개다.
  비워두면 Google 버튼이 숨고 이메일+비밀번호만 동작한다 — 나중에 켜도 된다.

> **이 파일은 두 곳에서 읽힌다.** `deploy.sh` 와 PM2 기동 셸이 `source` 로 읽고(셸 문법),
> `next start` 는 Next 자체 파서로 읽는다. 두 규칙이 겹치는 범위 안에서만 써야 한다:
> 따옴표 없이, 공백 없이, 값에 `#`(주석으로 잘림) 과 `$`(셸이 치환) 를 넣지 말 것.
> **비밀번호는 `openssl rand -hex 24` 처럼 영숫자만 나오게 만드는 게 안전하다.**

## 4. 첫 배포

```bash
cd /var/www/to-do-list-rpg
npm ci
npm run build

# 마이그레이션 (스키마 생성)
set -a; source .env; set +a
npm run db:migrate
```

`npm ci` 에 `--omit=dev` 를 쓰지 않는다: `next build` 에 typescript/tailwind 가,
`db:migrate` 에 tsx 가 필요하다. 전부 devDependency 다.

> **`db:migrate` 는 `.env` 를 스스로 읽지 않는다.** `src/db/migrate.ts` 는 `.env.local` 만 보고,
> 서버에는 그 파일이 없다. 그래서 위의 `source` 한 줄이 필수다. (`deploy.sh` 는 이걸 대신 해준다.)

확인 — 테이블 9개가 생겨야 한다:

```bash
psql "$DATABASE_URL" -c '\dt'
```

## 5. PM2 로 구동하기

PM2 는 이미 깔려 있다(`my-btc-trading` 이 쓰는 것과 **같은 데몬**을 공유한다). 없다면:

```bash
npm install -g pm2
```

### 시작

**환경변수를 셸에 올린 뒤 시작해야 한다.** PM2 는 `start` 시점의 셸 환경을 앱에 물려준다.

```bash
cd /var/www/to-do-list-rpg
set -a; source .env; set +a      # ← 이 줄을 빼면 앱이 500 을 낸다
pm2 start deploy/ecosystem.config.js
pm2 save
```

> **함정 1 — `env_file` 은 쓰지 말 것.**
> ecosystem 설정에 `env_file: '.env'` 를 적어도 **PM2 7.0.3 에서 조용히 무시된다**(실측).
> `DATABASE_URL` 이 프로세스에 들어가지 않아 `env.ts` 검증에 걸려 500 이 난다.
> 더 나쁜 건, 개발 PC 에서는 Next 가 `.env.local` 을 자동으로 읽어 멀쩡해 보인다는 점이다 —
> 서버에 올려야 티가 난다. 그래서 위의 `source` 한 줄이 필수다.

확인 — **루프백에만** 떠 있어야 한다:

```bash
pm2 list                                   # status: online (btc 앱도 그대로 online 이어야 한다)
ss -tlnp | grep 3002                       # 127.0.0.1:3002 여야 정상
curl -I http://127.0.0.1:3002/signin       # 200

# 환경변수가 실제로 들어갔는지 (id 는 pm2 list 에서 확인)
pm2 env <id> | grep -E 'DATABASE_URL|AUTH_URL'
```

> **함정 2 — `HOSTNAME` 으로는 못 막는다.**
> `HOSTNAME` 환경변수는 standalone 빌드의 `server.js` 만 읽는다. `next start` 는 무시하고
> `0.0.0.0` 에 바인딩한다. `ecosystem.config.js` 의 `args` 에 있는 `-H 127.0.0.1` 이
> 유일하게 동작하는 방법이다. 이 플래그를 지우면 `*:3002` 로 열려서, Nginx 를 거치지 않고
> 앱에 직접 붙을 수 있게 된다.

### 재부팅 후 자동 시작

이미 설정되어 있다(`pm2-root` 유닛). 새로 잡아야 한다면:

```bash
pm2 startup systemd          # 출력되는 sudo 명령을 그대로 복사해 실행
pm2 save                     # 현재 프로세스 목록 + 환경을 스냅샷으로 저장
```

`pm2 save` 로 저장한 스냅샷(`/root/.pm2/dump.pm2`)에 **환경변수가 그대로 들어간다.**
비밀값이 한 벌 더 생기는 셈이니 권한을 확인해둔다:

```bash
chmod 600 /root/.pm2/dump.pm2
ls -l /root/.pm2/dump.pm2        # 남이 읽을 수 없어야 한다
```

### 운영 명령

```bash
pm2 logs to-do-list-rpg              # 실시간 로그
pm2 logs to-do-list-rpg --lines 100
pm2 list                             # 상태
pm2 monit                            # CPU/메모리
pm2 reload to-do-list-rpg            # 재시작
```

> **함정 3 — `.env` 를 고쳤다면 `--update-env` 가 필요하다.**
> 그냥 `pm2 restart` 하면 **옛 환경변수를 그대로 물려준다**(실측: 값을 바꿔도 재시작 후
> 옛 값이 남아 있었다). "env 를 고쳤는데 왜 안 바뀌지" 의 범인이다.
>
> ```bash
> set -a; source .env; set +a
> pm2 reload to-do-list-rpg --update-env
> pm2 save --force                    # 스냅샷도 갱신해야 재부팅 후에도 유지된다
> ```

### cluster 모드로 늘리려면

지금 설정은 `exec_mode: 'fork'`, `instances: 1` 이다. 늘리기 전에 두 가지를 알아야 한다.

- **`script: 'npm'` 으로는 cluster 가 동작하지 않는다.** cluster 는 node 스크립트를 직접
  실행해야 하므로 `script: 'node_modules/next/dist/bin/next'`, `args: 'start -H 127.0.0.1 -p 3002'`
  로 바꿔야 한다.
- **DB 커넥션이 인스턴스 수만큼 곱해진다.** `src/db/index.ts` 의 풀이 프로세스당 `max: 10` 이라
  4 인스턴스면 최대 40 개다. Postgres 기본 `max_connections` 는 100 이다.
- 이 서버는 메모리가 2GB 이고 다른 앱도 산다. 늘리기 전에 여유를 먼저 본다.

세션은 JWT 이고 레이트리밋은 DB 카운트 기반이라 인스턴스를 늘려도 로직은 깨지지 않는다.

---

## 6. Nginx + TLS (Cloudflare)

TLS 는 **Cloudflare 가 처리한다.** 브라우저↔Cloudflare 는 Cloudflare 의 엣지 인증서로 https 이고,
Cloudflare↔오리진 구간은 **Cloudflare Origin 인증서**로 암호화한다(SSL 모드 Full strict).
certbot / Let's Encrypt 는 쓰지 않는다.

### Origin 인증서 발급 (오리진 개인키를 밖으로 내보내지 않는 방식)

개인키·CSR 을 **서버에서** 만들고, Cloudflare 에는 CSR 만 넣는다. 개인키는 서버 밖으로 안 나간다.

```bash
mkdir -p /etc/ssl/rpg-origin && chmod 700 /etc/ssl/rpg-origin
cd /etc/ssl/rpg-origin
openssl req -new -newkey rsa:2048 -nodes \
  -keyout origin.key -out origin.csr \
  -subj "/CN=rpg.pjsk.kr" -addext "subjectAltName=DNS:rpg.pjsk.kr"
chmod 600 origin.key
cat origin.csr        # 이 CSR 을 Cloudflare 에 붙여넣는다
```

Cloudflare 대시보드에서:

1. **SSL/TLS → Origin Server → Create Certificate**
2. **"I have my own private key and CSR"** 를 고르고 위 CSR 을 붙여넣는다 (기본값인 Cloudflare
   키 생성이 아니라 이걸 골라야 개인키가 노출되지 않는다).
3. Hostnames `rpg.pjsk.kr`, 유효기간 15년 → Create.
4. 나오는 **Origin Certificate** 를 서버 `/etc/ssl/rpg-origin/origin.crt` 로 저장 (644).
5. **SSL/TLS → Overview → Full (strict)** 로 설정.

인증서와 키의 짝을 반드시 확인한다 (두 해시가 같아야 nginx 가 로드한다):

```bash
openssl x509 -in /etc/ssl/rpg-origin/origin.crt -noout -pubkey | openssl md5
openssl pkey -in /etc/ssl/rpg-origin/origin.key -pubout | openssl md5
```

### Nginx 설정

`deploy/nginx.conf` 는 443(ssl) + 80(→https 리다이렉트) 블록을 담고 있다. `server_name rpg.pjsk.kr`
이라 btc 앱(80 default_server)과 이름 기반으로 갈라진다.

```bash
cd /var/www/to-do-list-rpg
cp deploy/nginx.conf /etc/nginx/sites-available/to-do-list-rpg
ln -sf /etc/nginx/sites-available/to-do-list-rpg /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> **`http2 on;` 은 nginx 1.25.1+ 문법이다.** 이 서버는 더 낮아서 `listen 443 ssl http2;` 로 쓴다.
> `unknown directive "http2"` 로 `nginx -t` 가 깨지면 이 경우다.

> **`sites-enabled/default` 를 지우지 말 것.** 이 서버에는 다른 사이트가 함께 산다.
> 지우면 그쪽 기본 동작이 바뀔 수 있다.

`X-Forwarded-Proto` 를 넘기는 세 줄이 설정에 있어야 한다. 없으면 로그인이 깨진다
(`AUTH_TRUST_HOST` 와 짝이다).

확인:

```bash
# 오리진 직접 (origin cert 라 -k 필요, 200 이면 정상)
curl -s -o /dev/null -w '%{http_code}\n' -k -H 'Host: rpg.pjsk.kr' https://127.0.0.1/signin
# Cloudflare 경유 (521 이면 SSL 모드가 Full strict 가 아니거나 오리진 443 이 안 뜬 것)
curl -s -o /dev/null -w '%{http_code}\n' https://rpg.pjsk.kr/signin
# btc 앱도 그대로 살아 있어야 한다
curl -s -o /dev/null -w '%{http_code}\n' http://141.164.63.179/
# 쿠키가 __Host-/Secure 로 나오면 https 인식이 맞다
curl -sI https://rpg.pjsk.kr/api/auth/csrf | grep -i set-cookie
```

## 7. 동작 확인

브라우저에서 `https://rpg.pjsk.kr` 을 열고:

1. 회원가입 → 메인으로 이동, 닉네임 표시
2. 할 일 등록 → **판타지 퀘스트**가 붙는지 (임시 의뢰서 문구가 뜨면 AI 호출 실패 → §문제 해결)
3. 완료 → 경험치·레벨 상승

브라우저 없이 AI 경로만 실측하려면:

```bash
cd /var/www/to-do-list-rpg
node --import tsx --env-file=.env --conditions=react-server scripts/quest-preview.mts
# 마지막 줄의 "폴백 0건" 을 확인한다
```

DB 에서도 확인:

```bash
set -a; source .env; set +a
psql "$DATABASE_URL" -c \
  "SELECT source, model, difficulty FROM quests ORDER BY created_at DESC LIMIT 3;"
# source=ai 여야 정상. fallback 이면 AI 호출이 실패한 것.
```

---

## 이후 배포

```bash
cd /var/www/to-do-list-rpg && ./scripts/deploy.sh
```

받기 → `npm ci` → 빌드 → 마이그레이션 → `pm2 reload --update-env` → `pm2 save --force` →
헬스체크 순서로 돌고, **빌드가 깨지면 거기서 멈춘다** (마이그레이션도 재시작도 하지 않으므로
구버전이 계속 서비스한다). 마지막에 30초 동안 실제 응답을 확인하고, 안 뜨면 실패로 끝난다.

### 스키마를 바꿨다면

`db:push` 는 **개발에서만** 쓴다. 프로덕션에는 커밋된 SQL 만 적용한다 —
`push` 는 drizzle-kit 이 컬럼 drop 을 조용히 제안해 데이터가 날아갈 수 있다.

```bash
# 개발 PC 에서
npm run db:generate       # drizzle/000X_*.sql 생성 → 커밋
```

서버의 `deploy.sh` 가 `db:migrate` 로 알아서 적용한다.

---

## 백업

이 앱은 유저의 할 일과 경험치 원장을 들고 있다. 날아가면 복구할 방법이 없다.

```bash
sudo -u postgres crontab -e
```

```cron
0 4 * * * pg_dump -Fc rpg > /var/backups/rpg-$(date +\%F).dump && find /var/backups -name 'rpg-*.dump' -mtime +14 -delete
```

**복구를 한 번은 해봐야 한다** — 테스트하지 않은 백업은 백업이 아니다.

```bash
sudo -u postgres createdb rpg_restore_test
sudo -u postgres pg_restore -d rpg_restore_test /var/backups/rpg-2026-07-15.dump
sudo -u postgres psql -d rpg_restore_test -c "SELECT count(*) FROM todos;"
sudo -u postgres dropdb rpg_restore_test
```

---

## 문제 해결

### 로그

```bash
pm2 logs to-do-list-rpg
pm2 logs to-do-list-rpg --lines 100
```

### `node: command not found` / `npm: command not found`

Node 가 nvm(`/root/.nvm`) 아래에만 있고, nvm 초기화는 `.bashrc` 에 있어 **대화형 셸에서만** 읽힌다.
`ssh js '...'` 처럼 비대화형으로 실행하면 PATH 에 없다. `deploy.sh` 는 이걸 스스로 처리하지만,
직접 명령을 돌릴 때는 PATH 를 얹어야 한다:

```bash
export PATH="/root/.nvm/versions/node/v24.14.1/bin:$PATH"
```

### 부팅 직후 죽는다

`src/lib/env.ts` 가 환경변수를 검증하고 없으면 **일부러** 죽인다. 로그에 어떤 변수가
비었는지 한국어로 찍힌다. `.env` 를 확인할 것.

`AUTH_GOOGLE_ID` 와 `AUTH_GOOGLE_SECRET` 은 **둘 다 채우거나 둘 다 비워야** 한다.
한쪽만 채우면 실수로 보고 죽는다.

십중팔구 `source` 를 빼먹은 것이다. PM2 는 `start` 시점의 셸 환경을 물려주므로,
`.env` 를 셸에 올리지 않고 `pm2 start` 하면 앱에 아무것도 전달되지 않는다.
`pm2 env <id> | grep DATABASE_URL` 로 확인할 것 — 비어 있으면 그 경우다.

### 포트 충돌 / 앱이 계속 재시작한다

`my-btc-trading` 이 3000 을 쓴다. 이 앱이 3000 으로 뜨면 둘이 같은 포트를 물어 한쪽이 죽는다.

```bash
ss -tlnp | grep -E ':(3000|3002) '
# 3000 → btc 앱, 3002 → 이 앱. 겹치면 위 §"지금 어디에 떠 있나" 의 세 파일을 확인한다.
```

### 퀘스트가 전부 "서기가 자리를 비워 임시 의뢰서로 붙였습니다"

AI 호출이 실패해 폴백으로 떨어진 것이다. **할 일 등록 자체는 성공하므로 앱은 계속 돈다** —
의도된 설계다(`docs/architecture.md`). 원인은 셋 중 하나다.

```bash
set -a; source .env; set +a

# 1. 키가 유효한가
curl -s -o /dev/null -w '%{http_code}\n' https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"        # 200 이어야 정상

# 2. 모델 이름이 맞는가 — 없는 모델이면 매번 폴백이다
curl -s https://api.openai.com/v1/models/$OPENAI_MODEL \
  -H "Authorization: Bearer $OPENAI_API_KEY"        # id 가 돌아와야 정상

# 3. 서버에서 외부로 나가는 443 이 막혔는가
```

로그에 `퀘스트 생성 실패 — 폴백` 과 원인이 함께 찍힌다.

### 로그인이 안 되거나 무한 리다이렉트

십중팔구 프록시 헤더 문제다.

- `AUTH_URL` 이 실제 공개 주소와 정확히 같은가 (`https://rpg.pjsk.kr`, 슬래시 없음)
- `AUTH_TRUST_HOST=true` 가 있는가
- Nginx 가 `X-Forwarded-Proto $scheme` 을 넘기는가

Google 로그인만 안 된다면 콘솔의 리디렉션 URI 에 프로덕션 주소가 있는지 본다.

### `https://rpg.pjsk.kr` 이 521 (Web server is down)

Cloudflare 가 오리진에 붙지 못한 것이다. Full (strict) 모드에서 Cloudflare 는 오리진 **443** 으로
붙는다. 확인 순서:

- 오리진 443 이 떠 있는가 — `ss -tlnp | grep 443`
- nginx 가 살아 있는가 — `nginx -t && systemctl reload nginx`
- 인증서/키 짝이 맞는가 — §6 의 두 md5 해시 비교
- Cloudflare SSL 모드가 Full (strict) 인가 (Flexible 이면 CF 는 오리진 80 으로 붙어 다르게 깨진다)

### "이미 다른 방식으로 가입된 이메일입니다"

버그가 아니다. 이메일+비밀번호로 가입한 계정에 같은 이메일의 Google 로 로그인하면 나온다.
자동 연결은 의도적으로 끄고 있다(`docs/architecture.md`).

### 개발 PC 에서 `db:migrate` 가 "type already exists" 로 실패한다

프로덕션 문제가 아니다. 로컬 DB 를 `db:push` 로 만들었다면 마이그레이션 이력 테이블이 없어서,
`migrate` 가 이미 있는 타입/테이블을 처음부터 다시 만들려다 부딪힌다.

개발에서는 계속 `db:push` 를 쓰면 되고, 굳이 로컬을 마이그레이션 기준으로 맞추고 싶다면
**데이터를 버려도 되는 경우에만** 다시 만든다:

```bash
docker compose down -v && docker compose up -d    # 볼륨까지 삭제됨
npm run db:migrate
```

**새로 만든 프로덕션 DB 에서는 이 문제가 없다** — 처음부터 `migrate` 로만 관리되기 때문이다.

### DB 에 못 붙는다

```bash
set -a; source .env; set +a
psql "$DATABASE_URL" -c 'select 1'
```

관리형/원격 DB 인데 SSL 오류가 난다면 `?sslmode=require` 를 붙였는지 확인한다.
코드는 SSL 을 연결 문자열에 위임하므로 그쪽만 고치면 된다.

---

## 알아둘 것

- **TLS 는 Cloudflare 가 처리한다.** 브라우저↔Cloudflare 는 엣지 인증서, Cloudflare↔오리진은
  Origin 인증서(Full strict) — §6. Origin 인증서는 2041 까지라 갱신 걱정은 없지만,
  **개인키 `/etc/ssl/rpg-origin/origin.key` 를 백업해두거나 유출 시 재발급할 것.**
- **오리진이 IP:443 으로 직접 노출된다.** Cloudflare 를 우회한 접속을 막으려면 §1 하드닝 참고.
- **앱이 `root` 로 돈다.** 권장 구성이 아니다 — §1 참고.
- **세션이 JWT 라 서버측 로그아웃이 없다.** `AUTH_SECRET` 을 바꾸면 전원이 로그아웃된다 —
  세션을 강제로 끊어야 할 때 쓸 수 있는 유일한 수단이다.
- **레이트리밋은 DB 카운트 기반**(유저당 1시간 30건)이라 인스턴스를 늘려도 동작한다.
  다만 `next start` 를 여러 개 띄우려면 Nginx upstream 에 추가하고 포트를 나눠야 한다.
- **AI 호출은 최대 10초**를 붙잡는다. Nginx `proxy_read_timeout` 을 그보다 짧게 잡으면
  성공한 생성이 502 로 끊긴다.
