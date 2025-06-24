import httpx
import os

# [수정] API 엔드포인트를 /api/chat으로 변경합니다.
OLLAMA_API_URL = os.getenv("OLLAMA_HOST") + "/api/generate"
FINETUNED_MODEL_NAME = "attention-coach-model:latest"

async def get_feedback_from_exaone(fact_summary: str) -> str:
    """
    파인튜닝된 EXAONE 모델을 호출하여, 최종 코칭 피드백을 생성합니다.
    test2.py에서 성공한 파라미터와 프롬프트 구조를 그대로 적용합니다.
    """
    print(f"INFO: [llmConnector] '{FINETUNED_MODEL_NAME}' 모델 호출 시작...")
    
    # test2.py에서 성공했던 '궁극의 시스템 프롬프트'를 적용합니다.
    # 단, API 호출 시에는 전체 대화가 아닌, 모델에게 직접 전달할 최종 프롬프트만 구성합니다.
    system_prompt = """
당신은 '온라인 학습 세션' 중인 학생의 데이터를 분석하여 '학습 집중도'에 대한 코칭을 제공하는 전문 AI 학습 코치입니다.
당신의 역할은 다음과 같은 순서로 답변을 구성하는 것입니다:

1. 인사 및 긍정적 칭찬: 따뜻한 인사와 함께, 데이터에서 발견한 긍정적인 점(예: 꾸준한 세션 참여)을 먼저 언급하며 칭찬합니다.
2. 데이터 기반 핵심 분석: 입력된 '사실 기반 요약문'의 수치를 직접 인용하여 어떤 부분(예: 주의 분산)이 가장 개선이 필요한지 분석합니다.
3. 구체적인 개선 전략 제안: 분석 결과를 바탕으로, 사용자가 바로 실천할 수 있는 구체적인 행동 방안을 1~2가지 제안합니다.
4. 마무리 격려: 긍정적인 응원 메시지로 답변을 마무리합니다.

**규칙:**
- 항상 친근하고 따뜻한 말투를 사용하세요.
- 문장 곳곳에 긍정적인 이모지(😊, 👍, 🎉, 💪, ✨)를 자연스럽게 사용하세요.
- 절대로 운전, 연구, 투자 등 '학습'과 관련 없는 주제를 언급해서는 안 됩니다.
- 답변은 반드시 한국어로 생성해야 합니다.
"""
    # Ollama의 /api/generate는 chat 템플릿을 직접 적용해주지 않으므로,
    # 우리가 직접 템플릿에 맞춰 프롬프트를 구성해야 합니다.
    final_prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n<|im_start|>user\n{fact_summary}<|im_end|>\n<|im_start|>assistant\n"


    try:
        async with httpx.AsyncClient(timeout=120.0) as client: # 타임아웃을 2분으로 더 넉넉하게
            response = await client.post(
                OLLAMA_API_URL,
                json={
                    "model": FINETUNED_MODEL_NAME,
                    "prompt": final_prompt, # 최종적으로 구성된 프롬프트를 전달
                    "stream": False,
                    # test2.py에서 성공한 파라미터를 options에 적용
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "num_ctx": 4096, # 컨텍스트 길이도 넉넉하게 설정
                    }
                },
            )
            response.raise_for_status()
            
            data = response.json()
            coaching_feedback = data.get("response", "").strip()
            
            if not coaching_feedback:
                return "AI 코칭 피드백을 생성할 수 없습니다."
            
            return coaching_feedback

    except Exception as e:
        print(f"ERROR: [llmConnector] 피드백 생성 중 에러 발생: {e}")
        return "AI 코칭 피드백 생성 중 에러가 발생했습니다."