import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Typography, message, Spin, Card, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, FileTextOutlined, LeftOutlined, StarOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ChromaCard from './chromaCard';
import CreateReportModal from './createReportModal';
import './reportList.css';

const { Title, Paragraph } = Typography;

function ReportList() {
  const [latestReport, setLatestReport] = useState(null);
  const [otherReports, setOtherReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const navigate = useNavigate();

  const fetchReports = async () => {
    // 최초 로딩 시에만 스피너를 보여주도록 설정합니다.
    // setLoading(true);
    try {
      const response = await axios.get('/api/users/1/reports');
      if (Array.isArray(response.data) && response.data.length > 0) {
        const sortedData = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setLatestReport(sortedData[0]);
        setOtherReports(sortedData.slice(1));
      } else {
        setLatestReport(null);
        setOtherReports([]);
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
      fetchReports(); // 삭제 후 목록을 새로고침합니다.
    } catch (error) {
      message.error('보고서 삭제에 실패했습니다.');
    }
  };

  const handleCardClick = (report) => {
    if (!report) return;
    // 상세 페이지로 이동하며, 제목과 생성일 정보를 state로 전달합니다.
    navigate(`/reports/${report._id}`, { 
      state: { 
        reportTitle: report.reportTitle,
        createdAt: report.createdAt 
      }
    });
  };

  const showCreateModal = () => setIsModalVisible(true);
  const handleModalClose = () => setIsModalVisible(false);
  const handleReportCreated = () => {
    // 보고서 생성 후, 백엔드 처리 시간을 기다렸다가 목록을 새로고침합니다.
    setTimeout(() => {
        fetchReports();
    }, 2000);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#101923' }}><Spin size="large" /></div>;
  }
  
  // 삭제 버튼 UI를 생성하는 헬퍼 함수
  const renderDeleteButton = (report) => (
    <Popconfirm
      title="정말로 이 보고서를 삭제하시겠습니까?"
      onConfirm={(e) => { e.stopPropagation(); handleDelete(report._id); }}
      onCancel={(e) => e.stopPropagation()}
      okText="예"
      cancelText="아니오"
      overlayInnerStyle={{backgroundColor: 'white'}}
    >
      <Button 
        type="text" 
        danger 
        icon={<DeleteOutlined />} 
        onClick={(e) => e.stopPropagation()}
      >
        삭제
      </Button>
    </Popconfirm>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <Button type="text" icon={<LeftOutlined />} onClick={() => navigate('/')} style={{ color: '#a6adb4', marginRight: '16px' }}>홈으로</Button>
          <Title level={2} style={{ color: 'white', margin: 0, display: 'inline-block' }}>보고서 대시보드</Title>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={showCreateModal}>
          새 보고서 생성
        </Button>
      </div>

      {latestReport && (
        <div style={{ marginBottom: '48px' }}>
          <Title level={4} style={{ color: '#a6adb4', marginBottom: '16px' }}><StarOutlined /> 가장 최근 보고서</Title>
          <Card
            hoverable
            className="featured-report-card"
            onClick={() => handleCardClick(latestReport)}
            actions={[renderDeleteButton(latestReport)]}
          >
            <Title level={3} style={{ color: '#2c3e50' }}>{latestReport.reportTitle || "제목 없음"}</Title>
            <Paragraph style={{ color: '#34495e' }}>생성일: {new Date(latestReport.createdAt).toLocaleString()}</Paragraph>
            <Tag color={latestReport.status === 'COMPLETED' ? 'blue' : 'gold'}>{latestReport.status}</Tag>
          </Card>
        </div>
      )}

      <Title level={4} style={{ color: '#a6adb4', marginBottom: '16px' }}>이전 보고서 목록</Title>
      <Row gutter={[24, 24]}>
        {otherReports.map((report) => (
          <Col key={report._id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              style={{ backgroundColor: '#1a232e', border: '1px solid #314b68' }}
              onClick={() => handleCardClick(report)}
              actions={[renderDeleteButton(report)]}
            >
              <Card.Meta
                title={<span style={{ color: 'white' }}>{report.reportTitle || "제목 없음"}</span>}
                description={
                  <>
                    <Paragraph style={{ color: '#a6adb4', fontSize: '12px', marginBottom: '8px' }}>
                      {new Date(report.createdAt).toLocaleString()}
                    </Paragraph>
                    <Tag color={report.status === 'COMPLETED' ? 'green' : 'gold'}>{report.status}</Tag>
                  </>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <CreateReportModal
        visible={isModalVisible}
        onClose={handleModalClose}
        onSuccess={handleReportCreated}
      />
    </div>
  );
}

export default ReportList;
