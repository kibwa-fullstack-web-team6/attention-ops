import os
import sys
import argparse # 커맨드 라인 인자를 처리하기 위한 라이브러리 import
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

# FastAPI 서버의 .env 파일을 찾기 위해 경로를 추가합니다.

load_dotenv(dotenv_path='.env')

def parseTimestamp(timestamp_str: str) -> datetime:
    """나노초 정밀도를 가진 ISO 형식의 시간 문자열을 변환합니다."""
    if '+' in timestamp_str:
        main_part, tz_part = timestamp_str.rsplit('+', 1)
        tz_part = '+' + tz_part
    elif 'Z' in timestamp_str:
        main_part, tz_part = timestamp_str.rsplit('Z', 1)
        tz_part = 'Z' + tz_part
    else:
        main_part, timestamp_str
        tz_part = ''
    if '.' in main_part:
        time_part, frac_part = main_part.rsplit('.', 1)
        frac_part = frac_part[:6]
        main_part = f"{time_part}.{frac_part}"
    clean_timestamp_str = main_part + tz_part
    return datetime.fromisoformat(clean_timestamp_str)

def getMongoConnection():
    """MongoDB 연결을 생성하고 DB 객체를 반환하는 함수"""
    mongo_host = os.getenv("MONGO_HOST")
    mongo_port = int(os.getenv("MONGO_PORT"))
    mongo_user = os.getenv("MONGO_USER")
    mongo_password = os.getenv("MONGO_PASSWORD")
    mongo_db_name = os.getenv("MONGO_DB_NAME")
    mongo_uri = f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}:{mongo_port}/"
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()
        print("🟢 MongoDB에 성공적으로 연결되었습니다.")
        return client[mongo_db_name]
    except Exception as e:
        print(f"🔴 MongoDB 연결 실패: {e}")
        return None

def processSessions(db):
    """
    모든 세션을 검사하여 '좋은 세션'과 '나쁜 세션'으로 분류합니다.
    """
    if db is None:
        return [], []

    print("\n🔍 모든 고유 세션 ID를 조회합니다...")
    all_session_ids = db.session_events.distinct("sessionId")
    print(f"📊 총 {len(all_session_ids)}개의 고유 세션을 찾았습니다.")

    good_session_ids = []
    bad_session_ids = []
    print("\n⚙️  각 세션을 검사하며 데이터 정제를 시작합니다...")

    for i, session_id in enumerate(all_session_ids):
        print(f"  -> ({i+1}/{len(all_session_ids)}) 세션 '{session_id[:8]}...' 검사 중...", end='\r')
        
        events = list(db.session_events.find({"sessionId": session_id}))
        
        is_good = True
        # 규칙 1: 이벤트 최소 10개
        if len(events) < 10:
            is_good = False
        
        # 규칙 2: 시작/종료 이벤트 존재
        if is_good:
            start_event = next((e for e in events if e.get("eventType") == "SESSION_START"), None)
            end_event = next((e for e in events if e.get("eventType") == "SESSION_END"), None)
            if not start_event or not end_event:
                is_good = False
            else:
                # 규칙 3: 최소 60초 이상
                try:
                    start_time = parseTimestamp(start_event['timestamp'])
                    end_time = parseTimestamp(end_event['timestamp'])
                    duration_seconds = (end_time - start_time).total_seconds()
                    if duration_seconds < 60:
                        is_good = False
                except (ValueError, KeyError):
                    is_good = False
        
        if is_good:
            good_session_ids.append(session_id)
        else:
            bad_session_ids.append(session_id)

    print("\n\n✅ 데이터 정제가 완료되었습니다.")
    return good_session_ids, bad_session_ids

def deleteBadSessions(db, session_ids_to_delete):
    """
    주어진 ID 목록에 해당하는 모든 세션 데이터를 삭제합니다.
    """
    if not session_ids_to_delete:
        print("\n🗑️  삭제할 세션 데이터가 없습니다.")
        return

    print(f"\n🗑️  총 {len(session_ids_to_delete)}개의 '나쁜' 세션을 삭제할 예정입니다.")
    # 최종 확인 질문 (안전 장치)
    confirm = input("  -> 정말로 이 세션들을 DB에서 영구적으로 삭제하시겠습니까? (y/n): ")

    if confirm.lower() == 'y':
        print("\n🔥 삭제 작업을 시작합니다...")
        for i, session_id in enumerate(session_ids_to_delete):
            result = db.session_events.delete_many({"sessionId": session_id})
            print(f"  -> ({i+1}/{len(session_ids_to_delete)}) 세션 '{session_id[:8]}...' 삭제 완료 ({result.deleted_count}개 문서)")
        print("\n✅ 모든 지정된 세션 데이터가 삭제되었습니다.")
    else:
        print("\nℹ️  삭제 작업이 취소되었습니다.")

if __name__ == "__main__":
    # 커맨드 라인 인자 파서 설정
    parser = argparse.ArgumentParser(description="Attention 프로젝트 데이터 정제 및 삭제 스크립트")
    parser.add_argument("--delete", action="store_true", help="필터링된 '나쁜' 세션 데이터를 실제로 삭제합니다.")
    args = parser.parse_args()

    db_connection = getMongoConnection()
    if db_connection is not None:
        good_sessions, bad_sessions = processSessions(db_connection)
        
        print(f"\n✨ 총 {len(good_sessions)}개의 양질의 세션을 찾았습니다.")
        print("--------------------------------------------------")
        for session_id in good_sessions:
            print(session_id)
        print("--------------------------------------------------")

        # --delete 플래그가 주어졌을 때만 삭제 로직 실행
        if args.delete:
            deleteBadSessions(db_connection, bad_sessions)
        else:
            print(f"\nℹ️  {len(bad_sessions)}개의 '나쁜' 세션이 발견되었습니다.")
            print("   (실제로 삭제하려면 --delete 옵션을 추가하여 스크립트를 다시 실행하세요.)")