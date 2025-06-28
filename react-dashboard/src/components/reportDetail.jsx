import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Row, Col, Statistic, Descriptions, Typography, Spin, message, Tag, Button, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
// Chart.js 관련 import 구문 수정
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title as ChartTitle } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // 1. 데이터 레이블 플러그인 import
import { Pie, Bar } from 'react-chartjs-2';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// 2. Chart.js에 모든 요소와 플러그인을 등록합니다.
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle, ChartDataLabels);

const { Title, Text, Paragraph } = Typography;

function ReportDetail() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { reportTitle, createdAt } = location.state || {};

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportContent = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/reports/${reportId}/content`);
        setReportData(response.data);
      } catch (error) {
        message.error('보고서 상세 내용을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchReportContent();
  }, [reportId]);

  const calculatedData = useMemo(() => {
    if (!reportData || !Array.isArray(reportData.sessions)) return null;

    const totalDurationMinutes = reportData.sessions.reduce((acc, session) => acc + session.totalDurationSeconds, 0) / 60;
    const totalEventCounts = { yawn: 0, distraction: 0, drowsiness: 0 };
    reportData.sessions.forEach(session => {
        totalEventCounts.yawn += session.eventCounts.yawn;
        totalEventCounts.distraction += session.eventCounts.distraction;
        totalEventCounts.drowsiness += session.eventCounts.drowsiness;
    });
    const totalAlerts = totalEventCounts.yawn + totalEventCounts.distraction + totalEventCounts.drowsiness;

    // 3. 원형 차트 데이터 및 옵션 수정
    const pieChartData = {
      labels: ['하품', '주의 분산', '졸음'],
      datasets: [{
        label: '이벤트 횟수',
        data: [totalEventCounts.yawn, totalEventCounts.distraction, totalEventCounts.drowsiness],
        backgroundColor: ['rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)'],
        borderColor: ['#FFCA28', '#FF6384', '#36A2EB'],
        borderWidth: 2,
      }],
    };
    const pieChartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            datalabels: { // 데이터 레이블 플러그인 설정
                formatter: (value, ctx) => {
                    const sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = (value * 100 / sum).toFixed(1) + '%';
                    return percentage;
                },
                color: '#fff',
                font: { weight: 'bold', size: 14 }
            }
        }
    };

    // 4. 막대 차트 데이터 및 옵션 수정
    const barChartData = {
      labels: reportData.sessions.map(s => new Date(s.sessionStart).toLocaleTimeString('ko-KR')),
      datasets: [{
        label: '세션별 지속 시간(초)',
        data: reportData.sessions.map(s => s.totalDurationSeconds),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: '#4BC0C0',
        borderWidth: 2
      }],
    };
     const barChartOptions = {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
            y: { beginAtZero: true }
        }
    };


    return {
      summary: {
        totalSessions: reportData.summary.totalSessions,
        totalDurationMinutes: totalDurationMinutes,
        totalAlerts: totalAlerts,
      },
      pieChartData,
      pieChartOptions,
      barChartData,
      barChartOptions,
    };
  }, [reportData]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}><Spin size="large" /></div>;
  }

  if (!calculatedData) {
    return <Title level={3} style={{textAlign: 'center', paddingTop: '50px'}}>보고서 데이터를 표시할 수 없습니다.</Title>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />} style={{ marginRight: '16px' }} />
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>{reportTitle || `보고서 #${reportId}`}</Title>
          <Text type="secondary">상세 분석 결과</Text>
        </div>
      </div>

      <Descriptions bordered style={{ marginBottom: 24 }} column={2}>
        <Descriptions.Item label="생성일">{createdAt ? new Date(createdAt).toLocaleString() : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="분석 기간">
          {reportData.dateRange.start ? new Date(reportData.dateRange.start).toLocaleDateString() : 'N/A'} ~ {reportData.dateRange.end ? new Date(reportData.dateRange.end).toLocaleDateString() : 'N/A'}
        </Descriptions.Item>
      </Descriptions>
      
      <Title level={4} style={{ marginBottom: 16 }}>핵심 요약</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}><Card><Statistic title="총 세션 수" value={calculatedData.summary.totalSessions} /></Card></Col>
        <Col xs={24} sm={12} md={8}><Card><Statistic title="총 학습 시간(분)" value={Math.round(calculatedData.summary.totalDurationMinutes)} /></Card></Col>
        <Col xs={24} sm={12} md={8}><Card><Statistic title="총 알림 횟수" value={calculatedData.summary.totalAlerts} suffix="회" /></Card></Col>
      </Row>
      
      <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>AI 학습 코치</Title>
      <Alert
        message="코칭 피드백"
        description={<ReactMarkdown>{reportData.coachingFeedback || "생성된 코칭 피드백이 없습니다."}</ReactMarkdown>}
        type="info"
        showIcon
      />

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={10}>
            <Card title="이벤트 유형 분석">
                <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                    <Pie data={calculatedData.pieChartData} options={calculatedData.pieChartOptions} />
                </div>
            </Card>
        </Col>
        <Col xs={24} lg={14}>
            <Card title="세션별 지속 시간">
                 <div style={{ height: '300px' }}>
                    <Bar data={calculatedData.barChartData} options={calculatedData.barChartOptions} />
                 </div>
            </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ReportDetail;

