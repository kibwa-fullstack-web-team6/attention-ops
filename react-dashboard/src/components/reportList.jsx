import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Typography, message, Spin, Card, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined, LeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ChromaCard from './chromaCard';
import CreateReportModal from './createReportModal'; // 1. 새로 만든 모달 컴포넌트를 import 합니다.
import './reportList.css';

const { Title, Paragraph } = Typography;

function ReportList() {
  const [latestReport, setLatestReport] = useState(null);
  const [otherReports, setOtherReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false); // 2. 모달의 표시 상태를 관리할 state를 추가합니다.
  const navigate = useNavigate();

  const fetchReports = async () => {
    // setLoading(true)는 이제 필요 없을 수 있습니다. 목록 새로고침 시에는 스피너가 돌지 않게 합니다.
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
    // ...
  };

  const handleCardClick = (reportId) => {
    // ...
  };

  const showCreateModal = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  const handleReportCreated = () => {
    // 보고서 생성 후, 2초 뒤에 목록을 새로고침하여 백엔드 처리 시간을 기다립니다.
    setTimeout(() => {
        fetchReports();
    }, 2000);
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
        {/* 3. 버튼 클릭 시 모달을 열도록 onClick 이벤트를 연결합니다. */}
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={showCreateModal}>
          새 보고서 생성
        </Button>
      </div>

      {/* 최신 보고서 섹션 */}
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

      {/* 이전 보고서들 섹션 */}
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

      {/* 4. 모달 컴포넌트를 페이지에 렌더링하고, 필요한 함수들을 props로 전달합니다. */}
      <CreateReportModal
        visible={isModalVisible}
        onClose={handleModalClose}
        onSuccess={handleReportCreated}
      />
    </div>
  );
}

export default ReportList;
