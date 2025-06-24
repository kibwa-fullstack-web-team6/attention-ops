import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Descriptions, Typography, Spin, message, Tag, Button, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import axios from 'axios';

// Chart.js에 필요한 요소들을 등록합니다.
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const { Title, Text } = Typography;

function ReportDetail() {
  const { reportId } = useParams();
  const navigate = useNavigate();
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
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportContent();
  }, [reportId]);

  // 데이터 계산 로직 (useMemo로 감싸서 reportData가 바뀔 때만 재계산)
  const calculatedData = useMemo(() => {
    if (!reportData || !Array.isArray(reportData.sessions)) {
      return null;
    }

    const totalDurationMinutes = reportData.sessions.reduce((acc, session) => acc + session.totalDurationSeconds, 0) / 60;
    const totalEventCounts = { yawn: 0, distraction: 0, drowsiness: 0 };
    reportData.sessions.forEach(session => {
        totalEventCounts.yawn += session.eventCounts.yawn;
        totalEventCounts.distraction += session.eventCounts.distraction;
        totalEventCounts.drowsiness += session.eventCounts.drowsiness;
    });
    const totalAlerts = totalEventCounts.yawn + totalEventCounts.distraction + totalEventCounts.drowsiness;

    const pieChartData = {
      labels: ['하품', '주의 분산', '졸음'],
      datasets: [{
        label: '이벤트 횟수',
        data: [totalEventCounts.yawn, totalEventCounts.distraction, totalEventCounts.drowsiness],
        backgroundColor: ['rgba(255, 206, 86, 0.5)', 'rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)'],
        borderColor: ['rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'],
        borderWidth: 1,
      }],
    };

    const barChartData = {
      labels: reportData.sessions.map((_, index) => `세션 ${index + 1}`),
      datasets: [{
        label: '세션별 총 이벤트 횟수',
        data: reportData.sessions.map(s => s.eventCounts.yawn + s.eventCounts.distraction + s.eventCounts.drowsiness),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }],
    };

    return {
      summary: {
        totalSessions: reportData.summary.totalSessions,
        totalDurationMinutes: totalDurationMinutes,
        totalAlerts: totalAlerts,
        averageFocusScore: 0, // 평균 집중도는 API에 없으므로, 일단 0으로 표시
      },
      pieChartData,
      barChartData,
    };

  }, [reportData]);

  // 로딩 및 에러 처리 (방어 코드)
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><Spin size="large" /></div>;
  }

  if (!calculatedData) {
    return <Title level={3}>보고서 데이터를 표시할 수 없습니다. 데이터 형식을 확인해주세요.</Title>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />} style={{ marginRight: '16px' }} />
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>{reportData.reportTitle || `보고서 #${reportId}`}</Title>
          <Text type="secondary">상세 분석 결과</Text>
        </div>
      </div>

      <Descriptions bordered style={{ marginBottom: 24 }} column={2}>
        <Descriptions.Item label="보고서 ID">{reportId}</Descriptions.Item>
        <Descriptions.Item label="생성일">{reportData.createdAt ? new Date(reportData.createdAt).toLocaleString() : 'N/A'}</Descriptions.Item>
        <Descriptions.Item label="상태"><Tag color="green">{reportData.status || 'COMPLETED'}</Tag></Descriptions.Item>
        <Descriptions.Item label="분석 기간">
          {new Date(reportData.dateRange.start).toLocaleDateString()} ~ {new Date(reportData.dateRange.end).toLocaleDateString()}
        </Descriptions.Item>
      </Descriptions>
      
      <Title level={4} style={{ marginBottom: 16 }}>핵심 요약</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="총 세션 수" value={calculatedData.summary.totalSessions} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="총 학습 시간(분)" value={Math.round(calculatedData.summary.totalDurationMinutes)} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="평균 집중도" value={calculatedData.summary.averageFocusScore} suffix="%" /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="총 알림 횟수" value={calculatedData.summary.totalAlerts} suffix="회" /></Card></Col>
      </Row>
      
      <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>AI 학습 코치</Title>
      <Alert
        message="코칭 피드백"
        description={reportData.coachingFeedback || "생성된 코칭 피드백이 없습니다."}
        type="info"
        showIcon
      />

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}><Card title="이벤트 유형 분석"><Pie data={calculatedData.pieChartData} /></Card></Col>
        <Col xs={24} md={12}><Card title="세션별 이벤트 발생 수"><Bar data={calculatedData.barChartData} /></Card></Col>
      </Row>
    </div>
  );
}

export default ReportDetail;