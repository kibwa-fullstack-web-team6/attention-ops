# --- 1단계: 빌더(Builder) 스테이지 ---
# 의존성을 설치하기 위한 기반 이미지
FROM python:3.11-slim as builder

# 작업 디렉토리 설정
WORKDIR /app

# 가상 환경 생성 및 활성화
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# requirements.txt를 먼저 복사하여 의존성 설치 (Docker 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# --- 2단계: 최종(Final) 스테이지 ---
# 실제 애플리케이션을 실행할 기반 이미지
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 빌더 스테이지에서 생성한 가상 환경만 복사
COPY --from=builder /opt/venv /opt/venv

# 애플리케이션 소스 코드 복사
COPY . .

# 가상 환경의 경로를 PATH에 추가
ENV PATH="/opt/venv/bin:$PATH"

# 컨테이너 외부로 노출할 포트 지정
EXPOSE 8000

# 컨테이너가 시작될 때 실행할 명령어
# uvicorn을 사용하여 Main.py의 app 인스턴스를 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]