import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

# .env 파일에서 환경 변수를 로드합니다.
load_dotenv()

class MongoConnector:
    """
    MongoDB 데이터베이스 연결 및 데이터 조회를 관리하는 클래스입니다.
    """
    def __init__(self):
        """
        클래스 인스턴스 생성 시, 환경 변수를 사용하여 MongoDB에 연결합니다.
        """
        mongo_host = os.getenv("MONGO_HOST")
        mongo_port = int(os.getenv("MONGO_PORT"))
        mongo_user = os.getenv("MONGO_USER")
        mongo_password = os.getenv("MONGO_PASSWORD")
        mongo_db_name = os.getenv("MONGO_DB_NAME")
        mongo_uri = f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}:{mongo_port}/"
        
        try:
            self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            self.db = self.client[mongo_db_name]
            # 서버 정보 출력을 통해 연결 성공 여부를 확인합니다.
            self.client.server_info() 
            print("🟢 MongoDB에 성공적으로 연결되었습니다.")
        except Exception as e:
            print(f"🔴 MongoDB 연결 실패: {e}")
            self.client = None
            self.db = None

    def get_session_data(self, session_id: str):
        """
        주어진 sessionId에 해당하는 모든 원시(raw) 이벤트를 조회합니다.
        """
        if self.db is None:
            return []
        
        query = {"sessionId": session_id}
        session_events = self.db.session_events.find(query, {'_id': 0})
        return list(session_events)

    def getSessionsByUserId(self, user_id: str):
        """
        주어진 userId에 해당하는 모든 세션의 요약 정보를 조회합니다.
        MongoDB Aggregation Pipeline을 사용하여 효율적으로 데이터를 집계합니다.
        """
        if self.db is None:
            return []

        pipeline = [
            { "$match": { "userId": user_id } },
            { "$sort": { "timestamp": 1 } },
            {
                "$group": {
                    "_id": "$sessionId",
                    "userId": { "$first": "$userId" },
                    "sessionStart": { "$first": "$timestamp" },
                    "sessionEnd": { "$last": "$timestamp" },
                    "eventCount": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "sessionId": "$_id",
                    "userId": "$userId",
                    "sessionStart": "$sessionStart",
                    "sessionEnd": "$sessionEnd",
                    "eventCount": "$eventCount"
                }
            },
            { "$sort": { "sessionStart": -1 } }
        ]
        
        sessions_summary = list(self.db.session_events.aggregate(pipeline))
        return sessions_summary

    def analyzeSessionWithAggregation(self, session_id: str):
        """
        [최적화된 방식]
        Aggregation Pipeline을 사용하여 DB에서 직접 세션 데이터를 분석합니다.
        """
        if self.db is None:
            return None

        pipeline = [
            { "$match": { "sessionId": session_id } },
            {
                "$group": {
                    "_id": "$sessionId",
                    "userId": { "$first": "$userId" },
                    "sessionStart": { "$min": "$timestamp" },
                    "sessionEnd": { "$max": "$timestamp" },
                    "yawnCount": { "$sum": { "$cond": [{ "$eq": ["$eventType", "YAWN_DETECTED"] }, 1, 0] } },
                    "distractionCount": { "$sum": { "$cond": [{ "$eq": ["$eventType", "DISTRACTION_STARTED"] }, 1, 0] } },
                    "drowsinessCount": { "$sum": { "$cond": [{ "$eq": ["$eventType", "DROWSINESS_STARTED"] }, 1, 0] } },
                    "totalDistractionMs": { "$sum": { "$cond": [{ "$eq": ["$eventType", "DISTRACTION_STARTED"] }, "$payload.previousStateDurationMs", 0] } },
                    "totalDrowsinessMs": { "$sum": { "$cond": [{ "$eq": ["$eventType", "DROWSINESS_STARTED"] }, "$payload.previousStateDurationMs", 0] } }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "sessionId": "$_id",
                    "userId": "$userId",
                    "sessionStart": "$sessionStart",
                    "sessionEnd": "$sessionEnd",
                    "eventCounts": { "yawn": "$yawnCount", "distraction": "$distractionCount", "drowsiness": "$drowsinessCount" },
                    "totalTimeMs": { "distraction": "$totalDistractionMs", "drowsiness": "$totalDrowsinessMs" }
                }
            }
        ]

        result = list(self.db.session_events.aggregate(pipeline))

        if result:
            analysis_report = result[0]
            start_time = datetime.fromisoformat(analysis_report['sessionStart'])
            end_time = datetime.fromisoformat(analysis_report['sessionEnd'])
            analysis_report['totalDurationSeconds'] = round((end_time - start_time).total_seconds(), 2)
            return analysis_report
        
        return None

# 앱 전체에서 사용할 단일 DB 커넥터 인스턴스를 생성합니다.
mongo_connector = MongoConnector()