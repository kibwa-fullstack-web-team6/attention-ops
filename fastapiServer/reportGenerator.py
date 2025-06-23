
import os
import boto3
import json
from mongoConnector import mongo_connector
# 새로 만든 llmConnector의 함수들을 import 합니다.
from llmConnector import get_summary_from_llama3, get_feedback_from_qwen

def generateAndUploadReport(report_id: str, user_id: str, start_date: str, end_date: str):
    """
    [2단계 LLM 체인 아키텍처]
    1. MongoDB에서 데이터를 집계하여 전체 보고서 JSON을 생성합니다.
    2. LLM 1 (Llama3)을 호출하여 사실 기반 요약문을 생성합니다.
    3. LLM 2 (Qwen)를 호출하여 요약문에 대한 코칭 피드백을 생성합니다.
    4. 원본 데이터와 최종 피드백을 합쳐 S3에 업로드하고, DB 상태를 업데이트합니다.
    """
    print(f"INFO: [Report {report_id[:8]}] 보고서 생성 시작.")
    
    try:
        # 1. MongoDB에서 데이터를 집계하여 초기 보고서 JSON 생성
        sessions_result = mongo_connector.getSessionsByUserId(user_id, start_date, end_date, page_size=1000)
        sessions = sessions_result.get("sessions", [])
        
        if not sessions:
            # 처리할 세션이 없으면 FAILED 처리
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

        # 2. LLM 1 (Llama3) 호출 -> 사실 요약문 생성
        fact_summary = get_summary_from_llama3(initial_report_json)
        print(f"INFO: [Report {report_id[:8]}] 2. Llama3 요약 생성 완료.")

        # 3. LLM 2 (Qwen) 호출 -> 최종 코칭 피드백 생성
        coaching_feedback = get_feedback_from_qwen(fact_summary)
        print(f"INFO: [Report {report_id[:8]}] 3. Qwen 코칭 피드백 생성 완료.")

        # 4. 최종 보고서 데이터에 LLM이 생성한 피드백 추가
        initial_report_json["llmSummary"] = fact_summary
        initial_report_json["coachingFeedback"] = coaching_feedback
        
        # 5. 최종본을 S3에 업로드
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

        # 6. MongoDB 상태를 'COMPLETED'로 업데이트
        mongo_connector.updateReportStatus(report_id, "COMPLETED", s3_path=s3_file_key)
        print(f"✅ SUCCESS: [Report {report_id[:8]}] 모든 보고서 생성 과정 완료.")

    except Exception as e:
        print(f"🔴 ERROR: [Report {report_id[:8]}] 보고서 생성 중 예외 발생: {e}")
        mongo_connector.updateReportStatus(report_id, "FAILED")