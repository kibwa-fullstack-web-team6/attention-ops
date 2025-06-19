from fastapi import APIRouter, HTTPException, Query, status, BackgroundTasks
from typing import Optional
from mongoConnector import mongo_connector
from models import ReportCreateRequest 
from reportGenerator import generateAndUploadReport 

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


# --- Reports API (신규 추가) ---

@router.post("/reports", status_code=status.HTTP_202_ACCEPTED)
def createReport(request: ReportCreateRequest, background_tasks: BackgroundTasks):
    """보고서 생성을 요청하고, 실제 생성 작업은 백그라운드에서 실행합니다."""
    report_id = mongo_connector.createReportMetadata(request.dict())
    if not report_id:
        raise HTTPException(status_code=500, detail="Failed to create report metadata")

    background_tasks.add_task(
        generateAndUploadReport,
        report_id,
        request.userId,
        request.startDate,
        request.endDate
    )
    
    return {"message": "Report generation has been started.", "reportId": report_id}


@router.get("/users/{user_id}/reports")
def getReportsByUser(user_id: str):
    """특정 사용자의 모든 보고서 메타데이터 목록을 조회합니다."""
    reports = mongo_connector.getReportsByUserId(user_id)
    return reports


@router.get("/reports/{report_id}")
def getReportStatus(report_id: str):
    """특정 보고서의 현재 상태와 정보를 조회합니다."""
    report = mongo_connector.getReportById(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report