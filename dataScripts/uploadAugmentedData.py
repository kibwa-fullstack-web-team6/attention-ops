import os
import sys
import json
import uuid
import boto3
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from urllib.parse import quote_plus # URL 인코딩을 위한 라이브러리 import

# 스크립트 파일의 현재 위치를 기준으로 .env 파일의 절대 경로를 계산합니다.
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
dotenv_path = os.path.join(project_root, 'fastapiServer', '.env')
load_dotenv(dotenv_path=dotenv_path)

def get_mongo_db():
    """MongoDB 연결을 생성하고 DB 객체를 반환합니다."""
    # .env 파일에서 정보 로드
    mongo_user = os.getenv('MONGO_USER')
    mongo_password = os.getenv('MONGO_PASSWORD')
    mongo_host = os.getenv('MONGO_HOST')
    mongo_port = int(os.getenv('MONGO_PORT')) # 포트를 정수형으로 변환
    mongo_db_name = os.getenv('MONGO_DB_NAME')

    # 사용자 이름과 비밀번호를 URL에 사용하기 안전하게 인코딩합니다.
    escaped_user = quote_plus(mongo_user)
    escaped_password = quote_plus(mongo_password)

    mongo_uri = f"mongodb://{escaped_user}:{escaped_password}@{mongo_host}:{mongo_port}/"
    
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.server_info()
        print("🟢 MongoDB에 성공적으로 연결되었습니다.")
        return client[mongo_db_name]
    except Exception as e:
        print(f"🔴 MongoDB 연결 실패: {e}")
        return None

def get_s3_client():
    """S3 클라이언트를 생성합니다."""
    return boto3.client('s3')

def upload_reports_for_user(db, s3_client, user_id, source_dir="dataScripts/augmented_reports"):
    """
    지정된 폴더의 모든 증강 보고서를 특정 사용자의 것으로 DB와 S3에 업로드합니다.
    """
    if not os.path.isdir(source_dir):
        print(f"🔴 ERROR: 소스 디렉토리 '{source_dir}'를 찾을 수 없습니다.")
        return

    bucket_name = os.getenv("S3_BUCKET_NAME")
    if not bucket_name:
        print("🔴 ERROR: S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.")
        return

    report_files = [f for f in os.listdir(source_dir) if f.endswith('.json')]
    print(f"🚀 총 {len(report_files)}개의 증강 보고서 파일을 'user_id: {user_id}'의 데이터로 업로드합니다.")

    for i, filename in enumerate(report_files):
        # 1. JSON 파일 읽기
        file_path = os.path.join(source_dir, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            report_content = json.load(f)

        # 2. 메타데이터 생성 및 DB에 삽입
        report_id = f"report-{uuid.uuid4()}" # 새로운 고유 ID 생성
        report_metadata = {
            "_id": report_id,
            "reportTitle": report_content.get("summary", {}).get("persona", "증강된 보고서"),
            "userId": user_id, # 목표 사용자로 ID 지정
            "status": "COMPLETED",
            "dateRange": report_content.get("dateRange"),
            "s3Path": f"reports/{user_id}/{report_id}.json",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "completedAt": datetime.now(timezone.utc).isoformat()
        }
        db.reports.insert_one(report_metadata)
        print(f"  -> ({i+1}/{len(report_files)}) MongoDB에 메타데이터 생성 완료: {report_id}")
        
        # 3. 사용자 ID를 수정한 후 S3에 업로드
        report_content["userId"] = user_id
        report_content["reportId"] = report_id
        try:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=report_metadata["s3Path"],
                Body=json.dumps(report_content, indent=2, ensure_ascii=False),
                ContentType='application/json'
            )
            print(f"  -> ({i+1}/{len(report_files)}) S3에 보고서 업로드 완료: {report_metadata['s3Path']}")
        except ClientError as e:
            print(f"🔴 ERROR: S3 업로드 실패. Key: {report_metadata['s3Path']}, Error: {e}")
            # 업로드 실패 시, 방금 넣은 메타데이터는 롤백(삭제)하는 것이 좋음
            db.reports.delete_one({"_id": report_id})
            print(f"  -> 롤백: MongoDB 메타데이터 삭제됨: {report_id}")

    print("\n✅ 모든 증강 보고서 데이터 업로드가 완료되었습니다.")

if __name__ == "__main__":
    db = get_mongo_db()
    s3 = get_s3_client()
    
    # 'if db and s3:' 대신 'is not None'으로 명시적으로 비교합니다.
    if db is not None and s3 is not None:
        # 여기에 보고서를 등록할 사용자 ID를 지정합니다.
        TARGET_USER_ID = "1"
        upload_reports_for_user(db, s3, TARGET_USER_ID)