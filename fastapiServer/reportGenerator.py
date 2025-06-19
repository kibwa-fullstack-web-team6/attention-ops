import os
import boto3
import json
from mongoConnector import mongo_connector

def generateAndUploadReport(report_id: str, user_id: str, start_date: str, end_date: str):
    """
    [백그라운드 작업]
    1. 해당 기간의 모든 세션을 조회합니다.
    2. 각 세션을 분석하여 최종 리포트 JSON을 만듭니다.
    3. JSON 파일을 S3에 업로드합니다.
    4. MongoDB의 리포트 상태를 업데이트합니다.
    """
    print(f"INFO: Report generation started for reportId: {report_id}")
    
    try:
        # 1. 해당 기간의 모든 세션 목록 조회
        sessions_result = mongo_connector.getSessionsByUserId(user_id, start_date, end_date, page_size=1000) # 페이지 크기를 크게 설정
        sessions = sessions_result.get("sessions", [])

        if not sessions:
            print(f"WARN: No sessions found for user {user_id} in the given date range.")
            mongo_connector.updateReportStatus(report_id, "FAILED")
            return

        # 2. 각 세션 분석 및 최종 리포트 데이터 구성
        analyzed_sessions = []
        for session in sessions:
            # getSessionsByUserId의 group stage 결과에서 sessionId는 '_id' 필드에 저장됩니다.
            # 따라서 session['_id']를 사용하도록 수정합니다.
            session_analysis = mongo_connector.analyzeSessionWithAggregation(session['_id'])
            if session_analysis:
                analyzed_sessions.append(session_analysis)
        
        final_report_data = {
            "reportId": report_id,
            "userId": user_id,
            "dateRange": {"start": start_date, "end": end_date},
            "summary": {
                "totalSessions": len(analyzed_sessions),
                # 여기에 총 하품 횟수, 총 졸음 시간 등 전체 기간에 대한 요약 통계를 추가할 수 있습니다.
            },
            "sessions": analyzed_sessions
        }

        # 3. S3에 JSON 파일 업로드
        s3_client = boto3.client('s3')
        bucket_name = os.getenv("S3_BUCKET_NAME")
        s3_file_key = f"reports/{user_id}/{report_id}.json"

        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_file_key,
            Body=json.dumps(final_report_data, indent=2, ensure_ascii=False),
            ContentType='application/json'
        )
        print(f"INFO: Report successfully uploaded to S3: {s3_file_key}")

        # 4. MongoDB 리포트 상태를 'COMPLETED'로 업데이트
        mongo_connector.updateReportStatus(report_id, "COMPLETED", s3_path=s3_file_key)
        print(f"INFO: Report generation COMPLETED for reportId: {report_id}")

    except Exception as e:
        print(f"ERROR: Report generation failed for reportId: {report_id}. Error: {e}")
        mongo_connector.updateReportStatus(report_id, "FAILED")

