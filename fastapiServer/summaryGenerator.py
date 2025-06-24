# fastapi-server/utils/summary_generator.py

def createSummarySentence(report_data: dict) -> str:
    """
    하나의 보고서 JSON 데이터를 받아,
    미리 정해진 형식의 사실 기반 요약문을 생성합니다.
    """
    try:
        # 날짜 포맷팅을 위해 datetime 라이브러리를 사용하는 것이 좋습니다.
        from datetime import datetime

        date_range = report_data.get("dateRange", {})
        # 날짜 문자열을 datetime 객체로 변환 후, 원하는 형식으로 다시 포맷팅
        start_date_obj = datetime.fromisoformat(date_range.get("start", " ").replace("Z", "+00:00"))
        end_date_obj = datetime.fromisoformat(date_range.get("end", " ").replace("Z", "+00:00"))
        start_date_str = start_date_obj.strftime('%Y-%m-%d')
        end_date_str = end_date_obj.strftime('%Y-%m-%d')

        summary_info = report_data.get("summary", {})
        total_sessions = summary_info.get("totalSessions", 0)
        
        total_yawn = 0
        total_distraction = 0
        total_drowsiness = 0
        
        sessions = report_data.get("sessions", [])
        for session in sessions:
            event_counts = session.get("eventCounts", {})
            total_yawn += event_counts.get("yawn", 0)
            total_distraction += event_counts.get("distraction", 0)
            total_drowsiness += event_counts.get("drowsiness", 0)

        summary_text = (
            f"분석 기간 {start_date_str}부터 {end_date_str}까지 총 {total_sessions}개의 세션이 진행되었습니다. "
            f"이 기간 동안 하품은 총 {total_yawn}회, "
            f"주의 분산은 총 {total_distraction}회, "
            f"졸음은 총 {total_drowsiness}회 감지되었습니다."
        )
        print(f"INFO: 요약문 생성 완료: {summary_text}")
        return summary_text
        
    except Exception as e:
        print(f"🔴 ERROR: 보고서 데이터 처리 중 오류 발생: {e}")
        return "요약문을 생성하는 데 실패했습니다."