import os
import boto3
import json
from botocore.exceptions import ClientError

class S3Connector:
    """
    AWS S3와의 통신을 관리하는 클래스입니다.
    """
    def __init__(self):
        # EC2에 연결된 IAM 역할이 자격 증명을 자동으로 처리합니다.
        self.s3_client = boto3.client('s3')
        self.bucket_name = os.getenv("S3_BUCKET_NAME")

    def getReportContent(self, s3_key: str):
        """
        주어진 키(경로)를 사용하여 S3 버킷에서 JSON 파일을 읽고,
        그 내용을 파싱하여 파이썬 딕셔너리로 반환합니다.
        """
        if not self.bucket_name:
            print("🔴 ERROR: S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.")
            return None
        
        try:
            # S3에서 객체를 가져옵니다.
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            # 객체의 본문(Body)을 utf-8로 디코딩하여 읽습니다.
            content = response['Body'].read().decode('utf-8')
            # JSON 문자열을 파이썬 딕셔너리로 변환합니다.
            return json.loads(content)
        except ClientError as e:
            # 파일을 찾지 못하는 등의 클라이언트 에러 처리
            print(f"🔴 ERROR: S3에서 객체를 가져오는 데 실패했습니다. Key: {s3_key}, Error: {e}")
            return None
        except Exception as e:
            # JSON 파싱 실패 등 기타 에러 처리
            print(f"🔴 ERROR: S3 객체 처리 중 에러 발생. Error: {e}")
            return None
    
    def deleteReportContent(self, s3_key: str):
        """
        [신규]
        주어진 키(경로)를 사용하여 S3 버킷에서 객체를 삭제합니다.
        """
        if not self.bucket_name:
            print("🔴 ERROR: S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.")
            return False
        
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            print(f"🟢 INFO: S3 객체가 성공적으로 삭제되었습니다. Key: {s3_key}")
            return True
        except ClientError as e:
            print(f"🔴 ERROR: S3 객체 삭제 중 에러 발생. Key: {s3_key}, Error: {e}")
            return False

# 앱 전체에서 사용할 단일 S3 커넥터 인스턴스를 생성합니다.
s3_connector = S3Connector()