from fastapi import FastAPI
import uvicorn
# apiRouter.py 파일에서 router 객체를 import 합니다.
from apiRouter import router as api_router

# FastAPI 앱 인스턴스 생성
app = FastAPI()

# api_router에 정의된 모든 경로에 '/api' 접두사를 붙여 메인 앱에 포함시킵니다.
app.include_router(api_router, prefix="/api")


@app.get("/")
def readRoot():
    """서버의 루트 경로로 접속 시 기본 메시지를 반환합니다."""
    return {"message": "Attention Project FastAPI Server"}

@app.get("/health")
def healthCheck():
    """외부 모니터링 시스템을 위한 상태 검사 엔드포인트입니다."""
    return {"status": "OK"}


# 이 스크립트가 직접 실행될 때 uvicorn 서버를 구동합니다.
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
