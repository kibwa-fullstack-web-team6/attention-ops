
from fastapi import FastAPI, HTTPException , Query, status
import uvicorn
from typing import Optional
from mongoConnector import mongo_connector

# FastAPI 앱 인스턴스 생성
app = FastAPI()

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
def getUserSessions(
    user_id: str,
    page: int = 1, 
    page_size: int = Query(default=10, le=100),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    쿼리 매개변수를 사용하여 필터링 및 페이지네이션된
    사용자의 세션 목록을 반환합니다.
    """
    # mongoConnector의 업데이트된 함수를 호출합니다.
    result = mongo_connector.getSessionsByUserId(
        user_id=user_id, 
        page=page, 
        page_size=page_size, 
        start_date=start_date, 
        end_date=end_date
    )
    
    if result["total"] == 0:
        # 데이터가 없는 경우 404를 보내지 않고, 빈 목록을 반환하는 것이 더 일반적입니다.
        return result
        
    return result


@app.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def deleteSession(session_id: str):
    """
    특정 세션 ID와 관련된 모든 이벤트 데이터를 삭제합니다.
    """
    deleted_count = mongo_connector.deleteSessionById(session_id)
    
    if deleted_count == 0:
        # 삭제할 데이터가 없는 경우, 클라이언트가 존재하지 않는 리소스를 요청한 것이므로
        # 404 Not Found 에러를 반환합니다.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session to delete not found")
    
    # 성공적으로 삭제된 경우, FastAPI는 status_code에 따라
    # 본문(body)이 없는 204 No Content 응답을 자동으로 보냅니다.
    return
    

# 이 스크립트가 직접 실행될 때 uvicorn 서버를 구동합니다.
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
