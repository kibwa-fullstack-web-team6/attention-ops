import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function ReportDetail() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportDetail = async () => {
      try {
        const response = await axios.get(`/api/reports/${reportId}/content`);
        setReport(response.data);
      } catch (err) {
        setError('상세 보고서 데이터를 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportDetail();
  }, [reportId]);

  if (loading) return <div>상세 보고서 로딩 중...</div>;
  if (error) return <div>에러: {error}</div>;
  if (!report) return <div>보고서가 없습니다.</div>;

  return (
    <div>
      <h2>{report.reportTitle} 분석</h2>
      {/* 여기에 차트 시각화가 들어갈 예정입니다. */}
    </div>
  );
}

export default ReportDetail;