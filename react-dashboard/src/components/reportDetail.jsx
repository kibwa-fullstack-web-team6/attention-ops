import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

// Chart.js 라이브러리에서 필요한 요소들을 import 합니다.
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Chart.js에 사용할 구성 요소를 등록합니다.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Pie 차트를 위해 ArcElement를 추가합니다.
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

  // 보고서 전체에 대한 요약 차트 데이터 생성
  const getTotalEventCounts = () => {
    const totalCounts = { yawn: 0, distraction: 0, drowsiness: 0 };
    report.sessions.forEach(session => {
      totalCounts.yawn += session.eventCounts.yawn;
      totalCounts.distraction += session.eventCounts.distraction;
      totalCounts.drowsiness += session.eventCounts.drowsiness;
    });
    return totalCounts;
  };

  const totalEventData = getTotalEventCounts();

  const pieChartData = {
    labels: ['총 하품 횟수', '총 주의 분산 횟수', '총 졸음 횟수'],
    datasets: [{
      data: [totalEventData.yawn, totalEventData.distraction, totalEventData.drowsiness],
      backgroundColor: [
        'rgba(255, 206, 86, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
      ],
      hoverOffset: 4,
    }],
  };

  // 개별 세션의 막대 차트 데이터를 생성하는 함수
  const getBarChartData = (session) => {
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
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
      ],
    };
  };

  return (
    <div>
      {/* 뒤로가기 링크 추가 */}
      <Link to="/">← 보고서 목록으로 돌아가기</Link>
      
      <h2 style={{marginTop: '20px'}}>{report.reportTitle} 상세 분석</h2>
      <p><strong>분석 기간:</strong> {new Date(report.dateRange.start).toLocaleDateString()} ~ {new Date(report.dateRange.end).toLocaleDateString()}</p>
      
      <hr />

      <h3>종합 분석 요약</h3>
      <p>총 {report.summary.totalSessions}번의 세션 동안의 이벤트 발생 비율입니다.</p>
      <div style={{ maxWidth: '400px', margin: 'auto' }}>
        <Pie data={pieChartData} />
      </div>

      <hr style={{margin: '40px 0'}} />

      <h3>세션별 상세 분석</h3>
      {report.sessions.map(session => (
        <div key={session.sessionId} style={{ border: '1px solid #ccc', margin: '20px', padding: '10px' }}>
            <h4>세션 ID: {session.sessionId}</h4>
            <p><strong>세션 시간:</strong> {new Date(session.sessionStart).toLocaleString()} ~ {new Date(session.sessionEnd).toLocaleString()} ({session.totalDurationSeconds}초)</p>
            <div style={{ maxWidth: '600px', margin: '20px auto' }}>
              <Bar data={getBarChartData(session)} />
            </div>
            <ul>
                <li>총 주의 분산 시간: {session.totalTimeMs.distraction / 1000}초</li>
                <li>총 졸음 시간: {session.totalTimeMs.drowsiness / 1000}초</li>
            </ul>
        </div>
      ))}
    </div>
  );
}

export default ReportDetail;