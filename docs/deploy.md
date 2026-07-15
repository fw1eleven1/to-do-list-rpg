# 배포 가이드

리눅스 VM 에 Node 로 직접 구동하는 기준. 앞에 Nginx 를 두고 TLS 를 붙인다.

```
인터넷 ──443/TLS──▶ Nginx ──▶ 127.0.0.1:3000 (next start) ──▶ PostgreSQL
```

관련 파일은 전부 리포지토리에 있다.

| 파일 | 용도 |
|---|---|
| `deploy/to-do-list-rpg.service` | systemd 유닛 |
| `deploy/ecosystem.config.js` | PM2 설정 (systemd 대신 쓸 경우) |
| `deploy/nginx.conf` | 리버스 프록시 |
| `deploy/env.production.example` | `/etc/to-do-list-rpg.env` 템플릿 |
| `scripts/deploy.sh` | 배포(받기 → 빌드 → 마이그레이션 → 재시작 → 헬스체크) |

프로세스 관리는 **systemd(5장)** 또는 **PM2(5-B장)** 중 하나만 쓴다. 둘 다 켜면 같은 포트를
두 프로세스가 물어 한쪽이 계속 죽는다.

## 준비물

- **Node 20.12 이상** (`package.json` 의 `engines`). Next 16 은 20.9+ 를 요구하지만 이 앱은
  `process.loadEnvFile` 을 써서 20.12 가 진짜 하한이다. 22 LTS 나 24 를 권한다.
- **PostgreSQL 17** (다른 메이저도 대체로 되지만 개발/검증은 17 로 했다)
- Nginx, certbot, git

---

## 1. 서버 기본 설정

```bash
# 앱 전용 계정 — 로그인 셸 없이
sudo useradd --system --create-home --home-dir /srv/to-do-list-rpg --shell /usr/sbin/nologin rpg

sudo -u rpg git clone <저장소 주소> /srv/to-do-list-rpg
```

방화벽은 **80/443 만** 연다. 앱(3000)과 Postgres(5432)는 절대 밖으로 열지 않는다.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status          # 3000, 5432 가 없어야 정상
```

## 2. DB 만들기

같은 서버에 Postgres 를 둔 경우:

```bash
sudo -u postgres psql <<'SQL'
CREATE USER rpg WITH PASSWORD '여기에-강한-비밀번호';
CREATE DATABASE rpg OWNER rpg;
SQL
```

`postgresql.conf` 의 `listen_addresses` 는 기본값(`localhost`)을 유지한다.
DB 를 다른 서버에 둔다면 연결 문자열에 **반드시 `?sslmode=require`** 를 붙인다.
코드는 벤더 SDK 없이 `DATABASE_URL` 하나만 보므로, 관리형 DB 로 옮겨도 문자열만 바꾸면 된다.

## 3. 환경변수

```bash
sudo cp /srv/to-do-list-rpg/deploy/env.production.example /etc/to-do-list-rpg.env
sudo chown root:root /etc/to-do-list-rpg.env
sudo chmod 600 /etc/to-do-list-rpg.env
sudo nano /etc/to-do-list-rpg.env
```

반드시 확인할 것:

- **`AUTH_SECRET` 은 새로 만든다** — `openssl rand -base64 32`.
  개발용과 같은 값을 쓰면 개발 PC 가 털렸을 때 프로덕션 세션이 위조된다.
- **`AUTH_URL`** 은 공개 https 주소, 뒤에 슬래시 없이.
- **`AUTH_TRUST_HOST=true`** — 리버스 프록시 뒤에서 도는 self-host 배포라 필요하다.
  없으면 NextAuth 가 `X-Forwarded-Proto` 를 믿지 않아 콜백 주소를 http 로 만든다.
- **Google 을 쓴다면** 콘솔의 승인된 리디렉션 URI 에
  `https://<도메인>/api/auth/callback/google` 를 추가한다. 개발용(`localhost:3001`)과 별개다.
  비워두면 Google 버튼이 숨고 이메일+비밀번호만 동작한다 — 나중에 켜도 된다.

> systemd `EnvironmentFile` 은 셸이 아니다. 따옴표가 값에 섞여 들어가고, `$VAR` 치환이 안 되며,
> 값 안의 `#` 부터는 주석으로 잘린다. **비밀번호에 `#` 을 넣지 말 것.**

## 4. 첫 배포

```bash
cd /srv/to-do-list-rpg
sudo -u rpg npm ci
sudo -u rpg npm run build

# 마이그레이션 (스키마 생성)
set -a; source /etc/to-do-list-rpg.env; set +a
sudo -u rpg -E npm run db:migrate
```

`npm ci` 에 `--omit=dev` 를 쓰지 않는다: `next build` 에 typescript/tailwind 가,
`db:migrate` 에 tsx 가 필요하다. 전부 devDependency 다.

## 5. systemd

```bash
sudo cp /srv/to-do-list-rpg/deploy/to-do-list-rpg.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now to-do-list-rpg
sudo systemctl status to-do-list-rpg
```

확인 — **루프백에만** 떠 있어야 한다:

```bash
sudo ss -tlnp | grep 3000
# 127.0.0.1:3000  이어야 정상.  *:3000 이나 0.0.0.0:3000 이면 잘못된 것.
curl -I http://127.0.0.1:3000/signin      # 200
```

> **함정**: `HOSTNAME=127.0.0.1` 환경변수로는 막히지 않는다. 그건 standalone 빌드의
> `server.js` 만 읽고 `next start` 는 무시해서 `0.0.0.0` 에 바인딩한다. 그래서 유닛의
> `ExecStart` 가 `-H 127.0.0.1` 플래그를 직접 준다. 이 줄을 지우면 방화벽이 열리는 순간
> Nginx 와 TLS 를 건너뛴 평문 접속이 가능해진다.

## 5-B. PM2 로 구동하기 (systemd 대신)

5장 대신 이 절을 쓴다. 둘 중 하나만 고른다.

```bash
sudo npm install -g pm2
```

### 시작

**환경변수를 셸에 올린 뒤 시작해야 한다.** PM2 는 `start` 시점의 셸 환경을 앱에 물려준다.

```bash
cd /srv/to-do-list-rpg
set -a; source /etc/to-do-list-rpg.env; set +a      # ← 이 줄을 빼면 앱이 500 을 낸다
pm2 start deploy/ecosystem.config.js
pm2 save
```

> **함정 1 — `env_file` 은 쓰지 말 것.**
> ecosystem 설정에 `env_file: '/etc/to-do-list-rpg.env'` 를 적어도 **PM2 7.0.3 에서 조용히
> 무시된다**(실측). `DATABASE_URL` 이 프로세스에 들어가지 않아 `env.ts` 검증에 걸려 500 이 난다.
> 더 나쁜 건, 개발 PC 에서는 Next 가 `.env.local` 을 자동으로 읽어 멀쩡해 보인다는 점이다 —
> 서버에 올려야 티가 난다. 그래서 위의 `source` 한 줄이 필수다.

확인 — **루프백에만** 떠 있어야 한다:

```bash
pm2 list                                   # status: online
sudo ss -tlnp | grep 3000                  # 127.0.0.1:3000 이어야 정상
curl -I http://127.0.0.1:3000/signin       # 200

# 환경변수가 실제로 들어갔는지
pm2 env 0 | grep -E 'DATABASE_URL|AUTH_URL'
```

> **함정 2 — `HOSTNAME` 으로는 못 막는다.**
> systemd 편과 같은 이유다. `ecosystem.config.js` 의 `args` 에 있는 `-H 127.0.0.1` 이
> 유일하게 동작하는 방법이다. 이 플래그를 지우면 `0.0.0.0` 에 열려서 방화벽이 열리는 순간
> Nginx 와 TLS 를 건너뛴 평문 접속이 가능해진다.

### 재부팅 후 자동 시작

```bash
pm2 startup systemd          # 출력되는 sudo 명령을 그대로 복사해 실행
pm2 save                     # 현재 프로세스 목록 + 환경을 스냅샷으로 저장
```

`pm2 save` 로 저장한 스냅샷(`~/.pm2/dump.pm2`)에 **환경변수가 그대로 들어간다.**
비밀값이 홈 디렉토리에 한 벌 더 생기는 셈이니 권한을 확인해둔다:

```bash
ls -l ~/.pm2/dump.pm2        # 남이 읽을 수 없어야 한다
```

이게 싫으면 systemd(5장)를 쓰는 게 낫다. `EnvironmentFile` 은 값을 복사해두지 않는다.

### 운영 명령

```bash
pm2 logs to-do-list-rpg              # 실시간 로그
pm2 logs to-do-list-rpg --lines 100
pm2 list                             # 상태
pm2 monit                            # CPU/메모리
pm2 reload to-do-list-rpg            # 재시작
```

> **함정 3 — `/etc/to-do-list-rpg.env` 를 고쳤다면 `--update-env` 가 필요하다.**
> 그냥 `pm2 restart` 하면 **옛 환경변수를 그대로 물려준다**(실측: 값을 바꿔도 재시작 후
> 옛 값이 남아 있었다). "env 를 고쳤는데 왜 안 바뀌지" 의 범인이다.
>
> ```bash
> set -a; source /etc/to-do-list-rpg.env; set +a
> pm2 reload to-do-list-rpg --update-env
> pm2 save --force                    # 스냅샷도 갱신해야 재부팅 후에도 유지된다
> ```

### 이후 배포

```bash
cd /srv/to-do-list-rpg
PROCESS_MANAGER=pm2 ./scripts/deploy.sh
```

`deploy.sh` 가 env 파일 source → 빌드 → 마이그레이션 → `pm2 reload --update-env` →
`pm2 save --force` → 헬스체크까지 처리한다.

### cluster 모드로 늘리려면

지금 설정은 `exec_mode: 'fork'`, `instances: 1` 이다. 늘리기 전에 두 가지를 알아야 한다.

- **`script: 'npm'` 으로는 cluster 가 동작하지 않는다.** cluster 는 node 스크립트를 직접
  실행해야 하므로 `script: 'node_modules/next/dist/bin/next'`, `args: 'start -H 127.0.0.1 -p 3000'`
  로 바꿔야 한다.
- **DB 커넥션이 인스턴스 수만큼 곱해진다.** `src/db/index.ts` 의 풀이 프로세스당 `max: 10` 이라
  4 인스턴스면 최대 40 개다. Postgres 기본 `max_connections` 는 100 이다.

세션은 JWT 이고 레이트리밋은 DB 카운트 기반이라 인스턴스를 늘려도 로직은 깨지지 않는다.

---

## 6. Nginx + HTTPS

`deploy/nginx.conf` 의 `rpg.example.com` 을 실제 도메인으로 바꾼 뒤:

```bash
sudo cp /srv/to-do-list-rpg/deploy/nginx.conf /etc/nginx/sites-available/to-do-list-rpg
sudo ln -s /etc/nginx/sites-available/to-do-list-rpg /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 인증서 — 443 서버 블록과 80→443 리다이렉트를 certbot 이 채워 넣는다
sudo certbot --nginx -d rpg.example.com
sudo systemctl list-timers | grep certbot     # 자동 갱신 타이머 확인
```

`X-Forwarded-Proto` 를 넘기는 세 줄이 설정에 있어야 한다. 없으면 로그인이 깨진다
(`AUTH_TRUST_HOST` 와 짝이다).

## 7. 동작 확인

브라우저에서 `https://<도메인>` 을 열고:

1. 회원가입 → 메인으로 이동, 닉네임 표시
2. 할 일 등록 → **판타지 퀘스트**가 붙는지 (임시 의뢰서 문구가 뜨면 AI 호출 실패 → §문제 해결)
3. 완료 → 경험치·레벨 상승

DB 에서도 확인:

```bash
sudo -u postgres psql -d rpg -c \
  "SELECT source, model, difficulty FROM quests ORDER BY created_at DESC LIMIT 3;"
# source=ai 여야 정상. fallback 이면 AI 호출이 실패한 것.
```

---

## 이후 배포

```bash
cd /srv/to-do-list-rpg && sudo -u rpg ./scripts/deploy.sh
```

받기 → `npm ci` → 빌드 → 마이그레이션 → 재시작 → 헬스체크 순서로 돌고,
**빌드가 깨지면 거기서 멈춘다** (마이그레이션도 재시작도 하지 않으므로 구버전이 계속 서비스한다).
마지막에 30초 동안 실제 응답을 확인하고, 안 뜨면 실패로 끝난다.

`deploy.sh` 는 `sudo systemctl restart` 를 호출한다. `rpg` 계정에 비밀번호 없이 그 명령만
허용하려면:

```bash
echo 'rpg ALL=(root) NOPASSWD: /bin/systemctl restart to-do-list-rpg' \
  | sudo tee /etc/sudoers.d/rpg-deploy
sudo chmod 440 /etc/sudoers.d/rpg-deploy
```

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
# systemd
sudo journalctl -u to-do-list-rpg -f          # 실시간
sudo journalctl -u to-do-list-rpg -n 100      # 최근 100줄

# PM2
pm2 logs to-do-list-rpg
pm2 logs to-do-list-rpg --lines 100
```

### 부팅 직후 죽는다

`src/lib/env.ts` 가 환경변수를 검증하고 없으면 **일부러** 죽인다. 로그에 어떤 변수가
비었는지 한국어로 찍힌다. `/etc/to-do-list-rpg.env` 를 확인할 것.

`AUTH_GOOGLE_ID` 와 `AUTH_GOOGLE_SECRET` 은 **둘 다 채우거나 둘 다 비워야** 한다.
한쪽만 채우면 실수로 보고 죽는다.

**PM2 를 쓴다면** 십중팔구 `source` 를 빼먹은 것이다. PM2 는 `start` 시점의 셸 환경을
물려주므로, env 파일을 셸에 올리지 않고 `pm2 start` 하면 앱에 아무것도 전달되지 않는다.
`pm2 env 0 | grep DATABASE_URL` 로 확인할 것 — 비어 있으면 그 경우다.

### 퀘스트가 전부 "서기가 자리를 비워 임시 의뢰서로 붙였습니다"

AI 호출이 실패해 폴백으로 떨어진 것이다. **할 일 등록 자체는 성공하므로 앱은 계속 돈다** —
의도된 설계다(`docs/architecture.md`). 원인은 셋 중 하나다.

```bash
# 1. 키가 유효한가
curl -s -o /dev/null -w '%{http_code}\n' https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"        # 200 이어야 정상

# 2. 모델 이름이 맞는가 — 없는 모델이면 매번 폴백이다
grep OPENAI_MODEL /etc/to-do-list-rpg.env

# 3. 서버에서 외부로 나가는 443 이 막혔는가
```

로그에 `퀘스트 생성 실패 — 폴백` 과 원인이 함께 찍힌다.

### 로그인이 안 되거나 무한 리다이렉트

십중팔구 프록시 헤더 문제다.

- `AUTH_URL` 이 실제 공개 주소와 정확히 같은가 (https, 슬래시 없음)
- `AUTH_TRUST_HOST=true` 가 있는가
- Nginx 가 `X-Forwarded-Proto $scheme` 을 넘기는가

Google 로그인만 안 된다면 콘솔의 리디렉션 URI 에 프로덕션 주소가 있는지 본다.

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
sudo -u rpg psql "$DATABASE_URL" -c 'select 1'
```

관리형/원격 DB 인데 SSL 오류가 난다면 `?sslmode=require` 를 붙였는지 확인한다.
코드는 SSL 을 연결 문자열에 위임하므로 그쪽만 고치면 된다.

---

## 알아둘 것

- **세션이 JWT 라 서버측 로그아웃이 없다.** `AUTH_SECRET` 을 바꾸면 전원이 로그아웃된다 —
  세션을 강제로 끊어야 할 때 쓸 수 있는 유일한 수단이다.
- **레이트리밋은 DB 카운트 기반**(유저당 1시간 30건)이라 인스턴스를 늘려도 동작한다.
  다만 `next start` 를 여러 개 띄우려면 Nginx upstream 에 추가하고 포트를 나눠야 한다.
- **AI 호출은 최대 10초**를 붙잡는다. Nginx `proxy_read_timeout` 을 그보다 짧게 잡으면
  성공한 생성이 502 로 끊긴다.
