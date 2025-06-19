from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from mongoConnector import mongo_connector

router = APIRouter()


@router.get("/sessions/{session_id}")
def getSessionById(session_id: str):
    session_data = mongo_connector.get_session_data(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_data

@router.get("/sessions/{session_id}/analysis")
def getSessionAnalysis(session_id: str):
    analysis_report = mongo_connector.analyzeSessionWithAggregation(session_id)
    if not analysis_report:
        raise HTTPException(status_code=404, detail="Session not found or analysis failed")
    return analysis_report

@router.get("/users/{user_id}/sessions")
def getUserSessions(
    user_id: str,
    page: int = 1, 
    page_size: int = Query(default=10, le=100),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    result = mongo_connector.getSessionsByUserId(
        user_id=user_id, 
        page=page, 
        page_size=page_size, 
        start_date=start_date, 
        end_date=end_date
    )
    if result["total"] == 0:
        return result
    return result

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def deleteSession(session_id: str):
    deleted_count = mongo_connector.deleteSessionById(session_id)
    if deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session to delete not found")
    return