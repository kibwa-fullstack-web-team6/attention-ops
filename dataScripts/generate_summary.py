import os
import sys
import json
import requests
import argparse
import time

# FastAPI 서버의 .env 파일을 찾기 위해 경로를 추가합니다.
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'fastapiServer'))
load_dotenv(dotenv_path='fastapiServer/.env')

OLLAMA_BASE_URL = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/api/generate"
def generate_summary_from_report(report_json_path: str, prompt_template_path: str):
    # ... (함수 내용은 이전과 동일) ...
    try:
        with open(report_json_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
    except FileNotFoundError:
        print(f"🔴 ERROR: 보고서 파일 '{report_json_path}'를 찾을 수 없습니다.")
        return
    except json.JSONDecodeError:
        print(f"🔴 ERROR: '{report_json_path}' 파일이 올바른 JSON 형식이 아닙니다.")
        return

    try:
        with open(prompt_template_path, 'r', encoding='utf-8') as f:
            prompt_template = f.read()
    except FileNotFoundError:
        print(f"🔴 ERROR: 프롬프트 템플릿 파일 '{prompt_template_path}'를 찾을 수 없습니다.")
        return

    full_prompt = prompt_template.replace("[JSON_DATA_HERE]", json.dumps(report_data, ensure_ascii=False))

    ollama_api_url = OLLAMA_API_URL
    payload = {
        "model": "llama3:8b-instruct-q4_k_m",
        "prompt": full_prompt,
        "stream": False
    }
    
    print(f"🚀 Ollama API에 요약 생성을 요청합니다. 모델: {payload['model']}")
    try:
        response = requests.post(ollama_api_url, json=payload, timeout=180)
        response.raise_for_status()
        
        response_json = response.json()
        summary_text = response_json.get("response", "오류: 응답을 생성하지 못했습니다.")
        
        print("\n--- [생성된 요약문] ---")
        print(summary_text.strip())
        print("--------------------")
        
    except requests.exceptions.RequestException as e:
        print(f"🔴 ERROR: Ollama API 호출 중 에러 발생: {e}")
        print("   Ollama 서버가 실행 중인지, 모델이 다운로드되었는지 확인하세요.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="보고서 JSON 파일로부터 요약문을 생성합니다.")
    parser.add_argument("report_file", help="요약할 보고서 JSON 파일의 경로")
    args = parser.parse_args()
    
    # [수정] 스크립트와 같은 폴더에 있는 템플릿 파일을 찾도록 경로 수정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    prompt_template_file = os.path.join(script_dir, 'summary_prompt_template.txt')
    
    generate_summary_from_report(args.report_file, prompt_template_file)