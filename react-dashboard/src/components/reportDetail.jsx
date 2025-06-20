import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Chart.js 라이브러리에서 필요한 요소들을 import 합니다.
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Chart.js에 사용할 구성 요소를 등록합니다.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);


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

  // 세션별 차트 데이터를 생성하는 함수
  const getChartData = (session) => {
    return {
      labels: ['하품', '주의 분산', '졸음'],
      datasets: [
        {
          label: '이벤트 발생 횟수',
          data: [
            session.eventCounts.yawn,
            session.eventCounts.distraction,
            session.eventCounts.drowsiness,
          ],
          backgroundColor: [
            'rgba(255, 206, 86, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
          ],
        },
      ],
    };
  };

  return (
    <div>
      <h2>{report.reportTitle} 분석</h2>
      <p><strong>보고서 ID:</strong> {report.reportId}</p>
      <p><strong>분석 기간:</strong> {report.dateRange.start} ~ {report.dateRange.end}</p>
      <p><strong>총 세션 수:</strong> {report.summary.totalSessions}</p>
      
      <hr />

      <h3>세션별 분석</h3>
      {report.sessions.map(session => (
        <div key={session.sessionId} style={{ border: '1px solid #ccc', margin: '20px', padding: '10px' }}>
            <h4>세션 ID: {session.sessionId}</h4>
            <p>총 학습 시간: {session.totalDurationSeconds}초</p>
            <div style={{ maxWidth: '600px', margin: 'auto' }}>
              {/* Bar 컴포넌트를 사용하여 차트를 렌더링합니다. */}
              <Bar data={getChartData(session)} />
            </div>
            <ul>
                <li>하품: {session.eventCounts.yawn}회</li>
                <li>주의 분산: {session.eventCounts.distraction}회 ({session.totalTimeMs.distraction / 1000}초)</li>
                <li>졸음: {session.eventCounts.drowsiness}회 ({session.totalTimeMs.drowsiness / 1000}초)</li>
            </ul>
        </div>
      ))}
    </div>
  );
}

export default ReportDetail;
