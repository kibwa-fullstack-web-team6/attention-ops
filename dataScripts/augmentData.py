import json
import random
import uuid
import os
from copy import deepcopy

def augment_report_data(template_path="template_report.json", num_reports=50):
    """
    템플릿 보고서 JSON을 기반으로, 다양한 사용자 유형의
    가짜 보고서 데이터를 대량으로 생성합니다.
    """
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_data = json.load(f)
    except FileNotFoundError:
        print(f"🔴 ERROR: 템플릿 파일 '{template_path}'을 찾을 수 없습니다.")
        return
    except json.JSONDecodeError:
        print(f"🔴 ERROR: '{template_path}' 파일이 올바른 JSON 형식이 아닙니다.")
        return

    # 가상 사용자 유형(페르소나) 정의
    personas = {
        "diligent_student": { "yawn": (0, 2), "distraction": (0, 5), "drowsiness": (0, 2) },
        "tired_student": { "yawn": (5, 20), "distraction": (2, 10), "drowsiness": (5, 15) },
        "distracted_student": { "yawn": (1, 5), "distraction": (10, 30), "drowsiness": (1, 5) }
    }
    
    output_dir = "augmented_reports"
    os.makedirs(output_dir, exist_ok=True)

    print(f"🚀 {num_reports}개의 데이터 증강을 시작합니다...")

    for i in range(num_reports):
        # 1. 템플릿 데이터를 깊은 복사합니다.
        new_report = deepcopy(template_data)

        # 2. 페르소나를 무작위로 선택합니다.
        persona_name, persona_ranges = random.choice(list(personas.items()))
        
        # 3. 새로운 고유 ID들을 생성하고, userId는 '1'로 고정합니다.
        user_id = "1" # 모든 보고서의 userId를 '1'로 고정
        new_report['reportId'] = f"report-{uuid.uuid4()}"
        new_report['userId'] = user_id
        
        # 4. 각 세션의 데이터를 페르소나에 맞게 수정합니다.
        for session in new_report['sessions']:
            session['sessionId'] = str(uuid.uuid4())
            session['userId'] = user_id # 각 세션의 userId도 '1'로 고정

            yawn_count = random.randint(*persona_ranges['yawn'])
            distraction_count = random.randint(*persona_ranges['distraction'])
            drowsiness_count = random.randint(*persona_ranges['drowsiness'])

            session['eventCounts']['yawn'] = yawn_count
            session['eventCounts']['distraction'] = distraction_count
            session['eventCounts']['drowsiness'] = drowsiness_count
            
            # 'totalTimeMs' 키가 없을 경우를 대비하여, setdefault로 안전하게 생성합니다.
            session.setdefault('totalTimeMs', {})

            session['totalTimeMs']['distraction'] = distraction_count * random.randint(1000, 5000)
            session['totalTimeMs']['drowsiness'] = drowsiness_count * random.randint(2000, 8000)

        # summary 객체는 원본 템플릿의 구조를 그대로 유지하도록 합니다.
        new_report['summary']['totalSessions'] = len(new_report['sessions'])
        
        # 5. 생성된 가짜 보고서를 별도의 JSON 파일로 저장합니다.
        output_path = os.path.join(output_dir, f"{new_report['reportId']}.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(new_report, f, indent=2, ensure_ascii=False)
            
        print(f"  -> ({i+1}/{num_reports}) {persona_name} 유형의 보고서 생성 완료: {output_path}")

    print(f"\n✅ 데이터 증강 완료! '{output_dir}' 폴더를 확인하세요.")


if __name__ == "__main__":
    # 50개의 가상 보고서를 생성합니다.
    augment_report_data(num_reports=50)
