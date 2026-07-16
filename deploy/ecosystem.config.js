// PM2 설정. 이 앱의 유일한 구동 경로다.
//
// 반드시 환경변수를 셸에 올린 뒤 시작해야 한다 — PM2 는 start 시점의 셸 환경을 앱에 물려준다:
//
//   cd /var/www/to-do-list-rpg
//   set -a; source .env; set +a
//   pm2 start deploy/ecosystem.config.js
//   pm2 save
//
// 자세한 절차와 함정은 docs/deploy.md 의 "PM2 로 구동하기" 참고.

module.exports = {
  apps: [
    {
      name: 'to-do-list-rpg',
      cwd: '/var/www/to-do-list-rpg',

      // 바인딩 주소·포트는 반드시 -H/-p 플래그로 준다.
      // HOSTNAME 환경변수는 standalone 빌드의 server.js 만 읽는다 — next start 는 무시하고
      // 0.0.0.0 에 바인딩해서, Nginx 와 TLS 를 건너뛴 평문 접속이 가능해진다.
      // 3000 은 같은 서버의 다른 Next 앱(my-btc-trading)이 쓰고 있다.
      script: 'npm',
      args: 'run start -- -H 127.0.0.1 -p 3002',

      // 비밀값은 여기 적지 않는다 — 이 파일은 리포지토리에 커밋된다.
      // 나머지 변수는 start 시점의 셸 환경에서 물려받는다 (위 주석의 source 한 줄).
      //
      // env_file 옵션은 쓰지 않는다. PM2 7.0.3 에서 조용히 무시되는 걸 실측했다:
      // .env 를 가리켜도 DATABASE_URL 이 프로세스에 들어가지 않아
      // env.ts 검증에 걸려 500 이 난다. (로컬에서는 Next 가 .env.local 을 자동으로 읽어
      // 멀쩡해 보이므로 서버에 올려야 티가 난다 — 더 위험하다.)
      env: {
        NODE_ENV: 'production',
      },

      // fork 1개. cluster 로 늘리려면 docs/deploy.md 의 주의사항을 먼저 볼 것
      // (script:'npm' 으로는 cluster 가 동작하지 않는다).
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      // 부팅 직후 DB 가 아직 안 떴을 때 무한 재시작으로 로그를 채우지 않게
      restart_delay: 5000,
      max_restarts: 10,
      // 이 시간을 버텨야 "정상 기동" 으로 보고 재시작 카운터를 리셋한다
      min_uptime: 10000,

      // Next 가 파일을 다시 쓰므로 watch 는 반드시 끈다 (배포 중 무한 재시작)
      watch: false,

      max_memory_restart: '512M',

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
