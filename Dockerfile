# 1. 베이스 이미지 선택
FROM node:20-alpine

# 2. 작업 디렉토리를 /usr/src/app으로 설정
WORKDIR /usr/src/app

# 3. 먼저 nodejs 폴더의 package.json 파일들만 복사
COPY nodejs/package*.json ./

# 4. 의존성 설치
RUN npm install

# 5. nodejs 폴더의 모든 소스 코드를 복사
COPY nodejs/ .

# 6. 포트 노출
EXPOSE 3000

# 7. 컨테이너 시작 명령어
CMD [ "node", "app.js" ]