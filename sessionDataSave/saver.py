import redis
import os
import json
import time

# --- 환경 설정 ---
# Docker Compose에서 주입한 환경 변수를 읽어옵니다.
# 환경 변수가 없으면 기본값('localhost')을 사용합니다.
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

# 데이터를 저장할 폴더를 지정하고, 없으면 생성합니다.
DATA_DIR = "saved_data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# 구독할 Redis 채널 목록
CHANNELS = ['attention-session-events', 'attention-data']

# --- 핵심 로직 ---

def main():
    """
    Redis 서버에 연결하고 지정된 채널을 구독하여,
    수신되는 메시지를 파일로 저장하는 메인 함수.
    """
    print("--- 데이터 저장 서비스(Data Saver) 시작 ---")
    
    # Redis 서버에 연결을 시도합니다.
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        # 연결 테스트
        r.ping()
        print(f"🟢 Redis 서버에 성공적으로 연결되었습니다. ({REDIS_HOST}:{REDIS_PORT})")
    except redis.exceptions.ConnectionError as e:
        print(f"🔴 Redis 연결 실패: {e}")
        print("--- 5초 후 재시도합니다... ---")
        time.sleep(5)
        # 연결 실패 시 재귀적으로 다시 시도
        main()
        return

    # Pub/Sub 객체 생성
    pubsub = r.pubsub()
    
    # 지정된 모든 채널을 구독합니다.
    pubsub.subscribe(*CHANNELS)
    print(f"📢 다음 채널들을 구독합니다: {CHANNELS}")
    print("--- 데이터 수신 대기 중... ---")

    # 메시지를 계속해서 기다리고 처리하는 무한 루프
    for message in pubsub.listen():
        # message 형식: {'type': 'subscribe', 'pattern': None, 'channel': '...', 'data': '...'}
        # 처음 구독 시에 들어오는 확인 메시지는 건너뜁니다.
        if message['type'] != 'message':
            continue

        try:
            # 수신된 데이터(JSON 문자열)를 Python 딕셔너리로 파싱합니다.
            data = json.loads(message['data'])
            
            # sessionId를 기준으로 파일 이름을 정합니다.
            session_id = data.get('sessionId')
            if not session_id:
                print(f"🟡 경고: sessionId가 없는 데이터 수신. 건너뜁니다. -> {data}")
                continue

            # 저장할 파일 경로 생성 (예: saved_data/f9168a51-e0b0-49bb-97ae-3c317c351775.jsonl)
            file_path = os.path.join(DATA_DIR, f"{session_id}.jsonl")

            # 파일에 한 줄씩 추가 모드('a')로 데이터를 저장합니다.
            # JSONL (JSON Lines) 형식: 각 줄이 하나의 유효한 JSON 객체인 효율적인 형식.
            with open(file_path, 'a', encoding='utf-8') as f:
                # 원본 메시지 전체를 저장하여 컨텍스트를 보존합니다.
                f.write(message['data'] + '\n')
            
            print(f"✅ 데이터 저장 완료 -> [Session: {session_id}, Channel: {message['channel']}]")

        except json.JSONDecodeError:
            print(f"🔴 에러: 수신된 데이터를 JSON으로 파싱할 수 없습니다. -> {message['data']}")
        except Exception as e:
            print(f"🔴 에러: 파일 저장 중 문제 발생. -> {e}")


if __name__ == "__main__":
    main()
