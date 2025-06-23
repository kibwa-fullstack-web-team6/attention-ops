import json
import random
import uuid
import os
from copy import deepcopy
from datetime import datetime, timedelta, timezone

def random_date(start, end):
    """지정된 두 날짜 사이의 랜덤한 날짜를 반환합니다."""
    return start + timedelta(
        seconds=random.randint(0, int((end - start).total_seconds())),
    )

def augment_report_data(template_path="template_report.json", num_reports=50):
    """
    [최종 버전]
    템플릿을 기반으로, 세션의 개수, 길이, 날짜까지 랜덤화하여
    구조적으로 매우 다양한 가짜 보고서 데이터를 생성합니다.
    """
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_data = json.load(f)
    except Exception as e:
        print(f"🔴 ERROR: 템플릿 파일 로드 실패. {e}")
        return

    personas = {
        "diligent_student": { "yawn_per_hour": (0, 5), "distraction_per_hour": (1, 10), "drowsiness_per_hour": (0, 3) },
        "tired_student": { "yawn_per_hour": (10, 40), "distraction_per_hour": (5, 20), "drowsiness_per_hour": (10, 30) },
        "distracted_student": { "yawn_per_hour": (2, 10), "distraction_per_hour": (20, 60), "drowsiness_per_hour": (1, 10) }
    }
    
    output_dir = "augmented_reports"
    os.makedirs(output_dir, exist_ok=True)
    print(f"🚀 {num_reports}개의 데이터 증강을 시작합니다...")
    
    # 보고서 기간을 4월 1일부터 6월 20일 사이로 설정
    period_start = datetime(2025, 4, 1, tzinfo=timezone.utc)
    period_end = datetime(2025, 6, 20, tzinfo=timezone.utc)

    for i in range(num_reports):
        new_report = deepcopy(template_data)
        persona_name, persona_rates = random.choice(list(personas.items()))
        
        # 1. 보고서 기간 랜덤화 (1일 ~ 7일 사이)
        report_duration_days = random.randint(1, 7)
        report_start_date = random_date(period_start, period_end - timedelta(days=report_duration_days))
        report_end_date = report_start_date + timedelta(days=report_duration_days)
        
        new_report['dateRange']['start'] = report_start_date.strftime('%Y-%m-%d')
        new_report['dateRange']['end'] = report_end_date.strftime('%Y-%m-%d')

        # 2. 세션 개수 랜덤화 (3개 ~ 15개)
        num_sessions = random.randint(3, 15)
        new_report['sessions'] = random.choices(new_report['sessions'], k=num_sessions) if new_report['sessions'] else []
        new_report['summary']['totalSessions'] = num_sessions
        
        # 3. 새로운 ID 및 userId 설정
        user_id = "1"
        new_report['reportId'] = f"report-{uuid.uuid4()}"
        new_report['userId'] = user_id
        
        # 4. 각 세션의 내용 랜덤화
        for session in new_report['sessions']:
            session['sessionId'] = str(uuid.uuid4())
            session['userId'] = user_id

            # 세션 시간을 보고서 기간 내에서 랜덤하게 설정
            session_start_time = random_date(report_start_date, report_end_date)
            duration_seconds = random.randint(300, 7200) # 5분 ~ 2시간
            session_end_time = session_start_time + timedelta(seconds=duration_seconds)
            
            session['sessionStart'] = session_start_time.isoformat()
            session['sessionEnd'] = session_end_time.isoformat()
            session['totalDurationSeconds'] = duration_seconds
            
            # 이벤트 횟수를 '시간당 발생률' 기반으로 변경
            duration_hours = duration_seconds / 3600
            yawn_count = int(random.uniform(*persona_rates['yawn_per_hour']) * duration_hours)
            distraction_count = int(random.uniform(*persona_rates['distraction_per_hour']) * duration_hours)
            drowsiness_count = int(random.uniform(*persona_rates['drowsiness_per_hour']) * duration_hours)

            session.setdefault('eventCounts', {})
            session['eventCounts']['yawn'] = yawn_count
            session['eventCounts']['distraction'] = distraction_count
            session['eventCounts']['drowsiness'] = drowsiness_count
            
            session.setdefault('totalTimeMs', {})
            session['totalTimeMs']['distraction'] = distraction_count * random.randint(1000, 5000)
            session['totalTimeMs']['drowsiness'] = drowsiness_count * random.randint(2000, 8000)

        # 5. 생성된 보고서 파일 저장
        output_path = os.path.join(output_dir, f"{new_report['reportId']}.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(new_report, f, indent=2, ensure_ascii=False)
            
        print(f"  -> ({i+1}/{num_reports}) {persona_name} 유형 ({num_sessions}개 세션, {report_start_date.strftime('%Y-%m-%d')}) 보고서 생성 완료.")

    print(f"\n✅ 데이터 증강 완료! '{output_dir}' 폴더를 확인하세요.")

if __name__ == "__main__":
    augment_report_data(num_reports=200)
