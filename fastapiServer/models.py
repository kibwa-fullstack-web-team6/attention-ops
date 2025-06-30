
from pydantic import BaseModel
from typing import Optional

class ReportCreateRequest(BaseModel):
    userId: str
    reportTitle: str
    startDate: str
    endDate: str

# 보고서 생성 요청용 모델