import redis
import os
import json
import time
from pymongo import MongoClient, errors

# --- 환경 설정 ---
# Docker Compose에서 주입한 환경 변수를 읽어옵니다.
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

# MongoDB 접속 정보를 환경 변수에서 읽어옵니다.
MONGO_HOST = os.getenv('MONGO_HOST')
MONGO_PORT = int(os.getenv('MONGO_PORT'))
MONGO_USER = os.getenv('MONGO_USER')
MONGO_PASSWORD = os.getenv('MONGO_PASSWORD')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME')

# MongoDB 연결 URI 생성
MONGO_URI = f"mongodb://{MONGO_HOST}:{MONGO_PORT}/"


if not all([MONGO_HOST, MONGO_PORT, MONGO_USER, MONGO_PASSWORD, MONGO_DB_NAME]):
    print("🔴 치명적 에러: MongoDB 접속을 위한 환경 변수가 모두 설정되지 않았습니다.")
    print("   (MONGO_HOST, MONGO_PORT, MONGO_USER, MONGO_PASSWORD, MONGO_DB_NAME)")
    sys.exit(1)

# --- 핵심 로직 ---
def main():
    """
    Redis 서버에 연결하고 지정된 채널을 구독하여,
    수신되는 메시지를 MongoDB에 저장하는 메인 함수.
    """
    print("--- 데이터 저장 서비스(Data Saver) 시작 ---")

    # Redis 클라이언트 생성 및 연결
    try:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        redis_client.ping()
        print(f"🟢 Redis 서버에 성공적으로 연결되었습니다. ({REDIS_HOST}:{REDIS_PORT})")
    except redis.exceptions.ConnectionError as e:
        print(f"🔴 Redis 연결 실패: {e}. 5초 후 재시도합니다...")
        time.sleep(5)
        main()
        return

    # MongoDB 클라이언트 생성 및 연결
    try:
        mongo_client = MongoClient(
            MONGO_URI,
            username=MONGO_USER,
            password=MONGO_PASSWORD,
            # 서버 선택 타임아웃을 5초로 설정
            serverSelectionTimeoutMS=5000
        )
        # 서버에 실제 연결을 시도하여 연결 상태를 확인합니다.
        mongo_client.admin.command('ping')
        db = mongo_client[MONGO_DB_NAME]
        collection = db['session_events']
        print(f"🟢 MongoDB에 성공적으로 연결되었습니다. ({MONGO_HOST}:{MONGO_PORT})")
    except errors.ConnectionFailure as e:
        print(f"🔴 MongoDB 연결 실패: {e}. 프로그램을 종료합니다.")
        return

    # Redis 채널 구독
    pubsub = redis_client.pubsub()
    CHANNELS = ['attention-meaningful-events'] # 이제 모든 이벤트는 이 단일 채널을 통해 들어옵니다.
    pubsub.subscribe(*CHANNELS)
    print(f"📢 다음 채널을 구독합니다: {CHANNELS}")
    print("--- 데이터 수신 대기 중... ---")

    # 메시지를 계속해서 기다리고 MongoDB에 저장하는 무한 루프
    for message in pubsub.listen():
        if message['type'] != 'message':
            continue

        try:
            # 수신된 데이터(JSON 문자열)를 Python 딕셔너리로 파싱
            data = json.loads(message['data'])
            
            # ✨ 파일에 쓰는 대신, MongoDB에 데이터를 삽입(insert)합니다.
            insert_result = collection.insert_one(data)
            
            session_id = data.get('sessionId', 'N/A')
            print(f"✅ 데이터 저장 완료 -> [Session: {session_id}, InsertedID: {insert_result.inserted_id}] -> MongoDB")

        except json.JSONDecodeError as e:
            print(f"🔴 JSON 파싱 에러: {e}, 원본: {message['data']}")
        except Exception as e:
            print(f"🔴 에러: MongoDB 저장 중 문제 발생 -> {e}")


if __name__ == "__main__":
    main()
