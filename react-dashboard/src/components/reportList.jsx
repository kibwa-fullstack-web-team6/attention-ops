import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Typography, message, Spin, Card, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined, LeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ChromaCard from './chromaCard';
import './reportList.css';

const { Title, Paragraph } = Typography;

function ReportList() {
  const [latestReport, setLatestReport] = useState(null);
  const [otherReports, setOtherReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/users/1/reports');
      if (Array.isArray(response.data) && response.data.length > 0) {
        const sortedData = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setLatestReport(sortedData[0]);
        setOtherReports(sortedData.slice(1));
      }
    } catch (error) {
      message.error('보고서 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (reportId) => {
    try {
      await axios.delete(`/api/reports/${reportId}`);
      message.success('보고서가 성공적으로 삭제되었습니다.');
      fetchReports();
    } catch (error) {
      message.error('보고서 삭제에 실패했습니다.');
    }
  };

  const handleCardClick = (reportId) => {
    navigate(`/reports/${reportId}`);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#101923' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <Button type="text" icon={<LeftOutlined />} onClick={() => navigate('/')} style={{ color: '#a6adb4', marginRight: '16px' }}>홈으로</Button>
          <Title level={2} style={{ color: 'white', margin: 0, display: 'inline-block' }}>보고서 대시보드</Title>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />}>새 보고서 생성</Button>
      </div>

      {/* 최신 보고서: 반짝이는 은색 Card */}
      {latestReport && (
        <div style={{ marginBottom: '48px' }}>
          <Card
            hoverable
            className="featured-report-card"
            onClick={() => handleCardClick(latestReport._id)}
          >
            <Title level={3} style={{ color: '#2c3e50' }}>{latestReport.reportTitle || "제목 없음"}</Title>
            <Paragraph style={{ color: '#34495e' }}>
              생성일: {new Date(latestReport.createdAt).toLocaleString()}
            </Paragraph>
            <Tag color={latestReport.status === 'COMPLETED' ? 'blue' : 'gold'}>{latestReport.status}</Tag>
          </Card>
        </div>
      )}

      {/* 이전 보고서들: ChromaCard를 적용합니다. */}
      <Title level={4} style={{ color: '#a6adb4', marginBottom: '16px' }}>이전 보고서 목록</Title>
      <Row gutter={[24, 24]}>
        {otherReports.map((report) => (
          <Col key={report._id} xs={24} sm={12} md={8} lg={6}>
            <ChromaCard report={report}>
              <FileTextOutlined style={{ fontSize: '28px', color: '#1677ff', marginBottom: '16px' }} />
              <Title level={5} style={{ color: 'inherit', fontWeight: 600, transition: 'color 0.4s ease' }}>
                {report.reportTitle || "제목 없음"}
              </Title>
              <Paragraph style={{ color: 'inherit', fontSize: '12px', marginBottom: '12px', transition: 'color 0.4s ease' }}>
                {new Date(report.createdAt).toLocaleString()}
              </Paragraph>
              <Tag color={report.status === 'COMPLETED' ? 'green' : 'gold'}>{report.status}</Tag>
            </ChromaCard>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default ReportList;
