import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid


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

    def getSessionsByUserId(self, user_id: str, start_date: str = None, end_date: str = None, page: int = 1, page_size: int = 10):
        """
        [업데이트]
        주어진 userId에 대해, 날짜 필터링 및 페이지네이션을 적용하여 세션 목록을 조회합니다.
        """
        if self.db is None:
            return {"total": 0, "sessions": []}

        # 1. 기본 매치 파이프라인: 특정 userId 필터링
        match_stage = {"userId": user_id}

        # 2. 날짜 필터링 조건 추가 (start_date, end_date가 주어진 경우)
        if start_date and end_date:
            match_stage["timestamp"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        
        # 3. 페이지네이션을 위한 계산
        skip_count = (page - 1) * page_size

        # 4. 전체 Aggregation Pipeline 구성
        #    - $facet을 사용하여 전체 데이터 개수와 페이지네이션된 데이터를 한 번의 쿼리로 가져옵니다.
        pipeline = [
            { "$match": match_stage },
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
            { "$sort": { "sessionStart": -1 } },
            {
                "$facet": {
                    "metadata": [ { "$count": "total" } ],
                    "data": [ { "$skip": skip_count }, { "$limit": page_size } ]
                }
            }
        ]
        
        result = list(self.db.session_events.aggregate(pipeline))
        
        # 5. 최종 결과 포맷팅
        if result and result[0]['metadata']:
            total_sessions = result[0]['metadata'][0]['total']
            sessions_data = result[0]['data']
            return {"total": total_sessions, "sessions": sessions_data}
        else:
            return {"total": 0, "sessions": []}

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
    def deleteSessionById(self, session_id: str) -> int:
        """
        [신규]
        주어진 sessionId에 해당하는 모든 이벤트를 삭제합니다.
        삭제된 문서의 수를 반환합니다.
        """
        if self.db is None:
            return 0

        query = {"sessionId": session_id}
        
        # delete_many 쿼리를 사용하여 조건에 맞는 모든 문서를 삭제합니다.
        delete_result = self.db.session_events.delete_many(query)
        
        # deleted_count 속성을 통해 몇 개의 문서가 삭제되었는지 알 수 있습니다.
        return delete_result.deleted_count

    def createReportMetadata(self, report_data: dict) -> str:
        """
        [신규] 보고서 메타데이터를 'reports' 컬렉션에 생성합니다.
        """
        if self.db is None:
            return None
        
        # 고유한 보고서 ID 생성
        report_id = f"report-{uuid.uuid4()}"
        
        document = {
            "_id": report_id,
            "reportTitle": report_data["reportTitle"],
            "userId": report_data["userId"],
            "status": "PENDING", # 초기 상태는 '대기 중'
            "dateRange": {
                "start": report_data["startDate"],
                "end": report_data["endDate"]
            },
            "s3Path": None,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "completedAt": None
        }
        
        self.db.reports.insert_one(document)
        return report_id

    def updateReportStatus(self, report_id: str, status: str, s3_path: str = None):
        """
        [신규] 특정 보고서의 상태와 S3 경로를 업데이트합니다.
        """
        if self.db is None:
            return

        update_fields = {
            "status": status,
            "completedAt": datetime.now(timezone.utc).isoformat()
        }
        if s3_path:
            update_fields["s3Path"] = s3_path
        
        self.db.reports.update_one(
            {"_id": report_id},
            {"$set": update_fields}
        )
    
    def getReportById(self, report_id: str):
        """
        [신규] 특정 보고서 ID로 메타데이터를 조회합니다.
        """
        if self.db is None:
            return None
        return self.db.reports.find_one({"_id": report_id})
        
    def getReportsByUserId(self, user_id: str):
        """
        [신규] 특정 사용자의 모든 보고서 메타데이터 목록을 조회합니다.
        """
        if self.db is None:
            return []
        reports = self.db.reports.find({"userId": user_id}, {'_id': 0}).sort("createdAt", -1)
        return list(reports)


# 앱 전체에서 사용할 단일 DB 커넥터 인스턴스를 생성합니다.
mongo_connector = MongoConnector()