# fastapiServer/main.py

from fastapi import FastAPI, HTTPException
import uvicorn
from mongoConnector import mongo_connector

# FastAPI 앱 인스턴스 생성
app = FastAPI()

@app.get("/")
def readRoot():
    """
    서버의 루트 경로로 접속 시 기본 메시지를 반환합니다.
    """
    return {"message": "Attention Project FastAPI Server"}

@app.get("/health")
def healthCheck():
    """
    외부 모니터링 시스템(예: 로드 밸런서)을 위한 상태 검사 엔드포인트입니다.
    """
    return {"status": "OK"}

@app.get("/sessions/{session_id}")
def getSessionById(session_id: str):
    """
    특정 세션 ID에 해당하는 모든 원시 이벤트 데이터를 반환합니다.
    """
    session_data = mongo_connector.get_session_data(session_id)
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return session_data

@app.get("/sessions/{session_id}/analysis")
def getSessionAnalysis(session_id: str):
    """
    Aggregation Pipeline을 사용하여 특정 세션의 분석 리포트를 반환합니다.
    """
    analysis_report = mongo_connector.analyzeSessionWithAggregation(session_id)
    
    if not analysis_report:
        raise HTTPException(status_code=404, detail="Session not found or analysis failed")
    
    return analysis_report

@app.get("/users/{user_id}/sessions")
def getUserSessions(user_id: str):
    """
    특정 사용자의 모든 세션 목록(요약 정보)을 반환합니다.
    """
    user_sessions = mongo_connector.getSessionsByUserId(user_id)
    
    if not user_sessions:
        raise HTTPException(status_code=404, detail="User not found or has no sessions")
        
    return user_sessions

# 이 스크립트가 직접 실행될 때 uvicorn 서버를 구동합니다.
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
