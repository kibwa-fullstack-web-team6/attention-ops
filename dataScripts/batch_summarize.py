import os
import json

def create_summary_sentence(report_data: dict) -> str:
    """
    하나의 보고서 JSON 데이터를 받아,
    미리 정해진 형식의 사실 기반 요약문을 생성합니다.
    """
    try:
        # 1. 필요한 정보 추출
        date_range = report_data.get("dateRange", {})
        start_date = date_range.get("start", "알 수 없음")
        end_date = date_range.get("end", "알 수 없음")
        
        summary_info = report_data.get("summary", {})
        total_sessions = summary_info.get("totalSessions", 0)
        
        # 2. 모든 세션을 순회하며 이벤트 총 횟수 계산
        total_yawn = 0
        total_distraction = 0
        total_drowsiness = 0
        
        sessions = report_data.get("sessions", [])
        for session in sessions:
            event_counts = session.get("eventCounts", {})
            total_yawn += event_counts.get("yawn", 0)
            total_distraction += event_counts.get("distraction", 0)
            total_drowsiness += event_counts.get("drowsiness", 0)

        # 3. 최종 요약 문장 생성 (F-string 사용)
        summary_text = (
            f"분석 기간 {start_date}부터 {end_date}까지 총 {total_sessions}개의 세션이 진행되었습니다. "
            f"이 기간 동안 하품은 총 {total_yawn}회, "
            f"주의 분산은 총 {total_distraction}회, "
            f"졸음은 총 {total_drowsiness}회 감지되었습니다."
        )
        return summary_text
        
    except Exception as e:
        print(f"🔴 ERROR: 보고서 데이터 처리 중 오류 발생: {e}")
        return "요약문을 생성하는 데 실패했습니다."

if __name__ == "__main__":
    # 이 스크립트와 같은 위치에 있는 폴더와 파일을 사용합니다.
    project_root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    reports_dir = os.path.join(project_root_dir, "dataScripts", "augmented_reports")
    output_file = os.path.join(project_root_dir, "dataScripts", "summaries.txt")

    if not os.path.isdir(reports_dir):
        print(f"🔴 ERROR: '{reports_dir}' 폴더를 찾을 수 없습니다. 먼저 augmentData.py를 실행하세요.")
        exit()

    report_files = [os.path.join(reports_dir, f) for f in os.listdir(reports_dir) if f.endswith('.json')]
    
    print(f"🚀 총 {len(report_files)}개의 보고서에 대한 요약 생성을 시작합니다...")

    with open(output_file, 'w', encoding='utf-8') as f_out:
        for i, report_file in enumerate(report_files):
            print(f"  -> ({i+1}/{len(report_files)}) 처리 중: {os.path.basename(report_file)}")
            
            try:
                with open(report_file, 'r', encoding='utf-8') as f_in:
                    data = json.load(f_in)
                summary = create_summary_sentence(data)
            except Exception as e:
                summary = f"파일 처리 오류: {e}"

            f_out.write(f"--- [SOURCE: {os.path.basename(report_file)}] ---\n")
            f_out.write(f"{summary}\n\n")
            
    print(f"\n✅ 모든 작업 완료! '{output_file}' 파일을 열어 요약문들을 확인하세요.")
    print("이제 이 일관된 요약문들을 input으로, 각 내용에 맞는 코칭 피드백을 output으로 작성하여 'feedback_dataset.jsonl' 파일을 만들면 됩니다.")