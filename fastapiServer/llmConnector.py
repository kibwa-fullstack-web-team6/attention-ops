import os # os 모듈을 import 합니다.
import requests
import json
from dotenv import load_dotenv

# .env 파일에서 환경 변수를 로드합니다.
load_dotenv()

# [수정] OLLAMA_HOST 환경 변수를 읽어오고, 없으면 localhost를 기본값으로 사용합니다.
OLLAMA_BASE_URL = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/api/generate"

# --- 1단계 LLM (분석가)을 위한 프롬프트 템플릿 ---
SUMMARY_PROMPT_TEMPLATE = """당신은 JSON 형식의 학습 보고서를 분석하여, 핵심적인 통계 수치를 사람이 읽기 쉬운 한국어 문장으로 요약하는 전문 데이터 분석가입니다.

아래의 [JSON 데이터]를 분석하여, 다음 규칙에 따라 '요약문'을 생성해주세요.

### 요약 규칙
1.  **포함할 항목:**
    * 보고서의 전체 분석 기간 (dateRange 필드 활용)
    * 기간 내 총 세션 횟수 (summary.totalSessions 필드 활용)
    * 기간 내 모든 세션에서 발생한 하품(yawn), 주의 분산(distraction), 졸음(drowsiness) 이벤트의 총 횟수를 각각 합산하여 명시.
2.  **출력 형식:**
    * 모든 정보를 종합하여 한 개의 자연스러운 단락으로 작성하세요.
    * 절대 JSON의 키(key) 이름(예: "totalSessions", "eventCounts")을 언급하지 마세요.
    * 오직 계산된 최종 수치와 사실만을 기반으로, 감정이나 추측 없이 건조한 톤으로 작성하세요.

[JSON 데이터 시작]
{json_data}
[JSON 데이터 끝]
"""

# --- 2단계 LLM (코치)을 위한 프롬프트 템플릿 ---
COACHING_PROMPT_TEMPLATE = """<|start_header_id|>system<|end_header_id|>
당신은 주어진 학습 요약 데이터를 보고, 사용자를 격려하고 통찰력 있는 조언을 해주는 긍정적인 학습 코치입니다. 100자에서 300자 사이의 따뜻하고 구체적인 피드백을 생성하세요.<|eot_id|><|start_header_id|>user<|end_header_id|>
{summary_text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""


def call_ollama_api(model_name: str, prompt: str) -> str:
    """Ollama API를 호출하고 응답 텍스트를 반환하는 범용 함수"""
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False
    }
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=180) # 타임아웃을 넉넉하게 설정
        response.raise_for_status()
        response_json = response.json()
        return response_json.get("response", "").strip()
    except requests.exceptions.RequestException as e:
        print(f"🔴 ERROR: Ollama API 호출 중 에러 발생 (모델: {model_name}): {e}")
        return "피드백 생성에 실패했습니다."

def get_summary_from_llama3(report_json: dict) -> str:
    """1단계: Llama3를 호출하여 JSON 보고서의 사실 기반 요약문을 생성합니다."""
    # JSON 객체를 문자열로 변환하여 템플릿에 삽입
    json_string = json.dumps(report_json, ensure_ascii=False)
    full_prompt = SUMMARY_PROMPT_TEMPLATE.replace("{json_data}", json_string)
    
    # Ollama에 등록된 Llama 3 모델 호출
    summary = call_ollama_api("llama3:8b-instruct-q4_k_m", full_prompt)
    return summary

def get_feedback_from_qwen(summary_text: str) -> str:
    """2단계: 파인튜닝된 Qwen을 호출하여 요약문에 대한 감성 코칭 피드백을 생성합니다."""
    full_prompt = COACHING_PROMPT_TEMPLATE.replace("{summary_text}", summary_text)
    
    # 나중에 파인튜닝 후 생성할 'attention-coach' 모델 호출 (지금은 qwen으로 테스트)
    feedback = call_ollama_api("qwen:0.5b-chat-v1.5-q4_k_m", full_prompt)
    return feedback

