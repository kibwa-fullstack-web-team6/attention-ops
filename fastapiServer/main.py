from fastapi import FastAPI

# FastAPI 앱 인스턴스 생성
app = FastAPI()

# 루트 경로("/")로 GET 요청이 오면 실행되는 함수
@app.get("/")
def read_root():
    return {"Hello": "World from FastAPI"}

# /health 경로로 GET 요청이 오면 "OK"를 반환 (상태 검사용)
@app.get("/health")
def health_check():
    return {"status": "OK"}
