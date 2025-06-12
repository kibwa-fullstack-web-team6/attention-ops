# 1. 베이스 이미지 선택
FROM node:20-alpine

# 2. 작업 디렉토리 설정
WORKDIR /usr/src/app

# 3. 패키지 복사
COPY nodejs/package*.json ./

# 4. 의존성 설치
RUN npm install

# ✨ 수정: 소스 코드도 'nodejs/' 폴더 안에 있는 것들만 복사합니다.
# 5. 소스 코드 전체 복사
COPY nodejs/ .

# 6. 애플리케이션이 사용할 포트 노출
EXPOSE 3000

# 7. 컨테이너 시작 명령어
CMD [ "node", "app.js" ]