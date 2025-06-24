import os
import boto3
import json
from mongoConnector import mongo_connector
from llmConnector import get_feedback_from_exaone
from summaryGenerator import createSummarySentence

async def generateAndUploadReport(report_id: str, user_id: str, start_date: str, end_date: str):
    print(f"INFO: [Report {report_id[:8]}] 보고서 생성 시작.")
    
    try:
        sessions_result = mongo_connector.getSessionsByUserId(user_id, start_date, end_date, page_size=1000)
        sessions = sessions_result.get("sessions", [])
        
        if not sessions:
            mongo_connector.updateReportStatus(report_id, "FAILED")
            return

        analyzed_sessions = [mongo_connector.analyzeSessionWithAggregation(s['_id']) for s in sessions if s]
        initial_report_json = {
            "reportId": report_id,
            "userId": user_id,
            "dateRange": {"start": start_date, "end": end_date},
            "summary": {"totalSessions": len(analyzed_sessions)},
            "sessions": analyzed_sessions
        }
        print(f"INFO: [Report {report_id[:8]}] 1. 초기 보고서 JSON 생성 완료.")

        fact_summary = createSummarySentence(initial_report_json)
        print(f"INFO: [Report {report_id[:8]}] 2. Python 기반 사실 요약 생성 완료.")

        coaching_feedback = await get_feedback_from_exaone(fact_summary)
        print(f"INFO: [Report {report_id[:8]}] 3. EXAONE 코칭 피드백 생성 완료.")

        initial_report_json["llmSummary"] = fact_summary
        initial_report_json["coachingFeedback"] = coaching_feedback
        
        s3_client = boto3.client('s3')
        bucket_name = os.getenv("S3_BUCKET_NAME")
        s3_file_key = f"reports/{user_id}/{report_id}.json"

        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_file_key,
            Body=json.dumps(initial_report_json, indent=2, ensure_ascii=False),
            ContentType='application/json'
        )
        print(f"INFO: [Report {report_id[:8]}] 4. 최종 보고서 S3 업로드 완료.")

        mongo_connector.updateReportStatus(report_id, "COMPLETED", s3_path=s3_file_key)
        print(f"✅ SUCCESS: [Report {report_id[:8]}] 모든 보고서 생성 과정 완료.")

    except Exception as e:
        print(f"🔴 ERROR: [Report {report_id[:8]}] 보고서 생성 중 예외 발생: {e}")
        mongo_connector.updateReportStatus(report_id, "FAILED")