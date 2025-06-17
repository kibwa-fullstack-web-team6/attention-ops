module.exports = {
  apps : [{
    name   : "app",              // PM2에서 관리할 앱 이름
    script : "./app.js",         // 실행할 스크립트 파일
    cwd    : "/root/deploy/nodejs", // <<<< 앱을 실행할 디렉토리 경로를 명시
    watch  : false,              // 파일 변경 감지 비활성화 (배포 스크립트로 제어)
    env: {
      "NODE_ENV": "development",
    },
    env_production: {
      "NODE_ENV": "production",
    }
  }]
}