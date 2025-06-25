import React, { useState, useEffect } from 'react';
import { Row, Col, Button, Typography, message, Spin, Card, Tag, Popconfirm } from 'antd';
// [수정] CloseOutlined 아이콘을 삭제 버튼으로 사용합니다.
import { PlusOutlined, FileTextOutlined, LeftOutlined, StarOutlined, CloseOutlined } from '@ant-design/icons';
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

  const fetchReports = async () => { /* ... 이전과 동일 ... */ };
  useEffect(() => { fetchReports(); }, []);
  const handleDelete = async (reportId) => { /* ... 이전과 동일 ... */ };
  const handleCardClick = (report) => { /* ... 이전과 동일 ... */ };
  const showCreateModal = () => setIsModalVisible(true);
  const handleModalClose = () => setIsModalVisible(false);
  const handleReportCreated = () => { setTimeout(() => { fetchReports(); }, 2000); };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#101923' }}><Spin size="large" /></div>;
  }

  // [수정] 재사용 가능한 삭제 버튼 UI를 생성하는 헬퍼 함수
  const renderDeleteButton = (report) => (
    <Popconfirm
      title="정말로 이 보고서를 삭제하시겠습니까?"
      onConfirm={(e) => { e.stopPropagation(); handleDelete(report._id); }}
      onCancel={(e) => e.stopPropagation()}
      okText="예"
      cancelText="아니오"
      // [수정] 팝업창 스타일을 흰색 배경으로 지정
      overlayInnerStyle={{ backgroundColor: 'white' }}
    >
      <CloseOutlined
        className="report-delete-button"
        onClick={(e) => e.stopPropagation()} 
      />
    </Popconfirm>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        {/* ... 헤더 부분은 이전과 동일 ... */}
      </div>

      {latestReport && (
        <div style={{ marginBottom: '48px' }}>
          {/* [수정] 최신 카드: wrapper div로 감싸고 삭제 버튼을 추가합니다. */}
          <div className="report-card-wrapper">
            <Card
              hoverable
              className="featured-report-card"
              onClick={() => handleCardClick(latestReport)}
              // actions prop은 완전히 제거합니다.
            >
              <Title level={3} style={{ color: '#2c3e50' }}>{latestReport.reportTitle || "제목 없음"}</Title>
              <Paragraph style={{ color: '#34495e' }}>
                생성일: {new Date(latestReport.createdAt).toLocaleString()}
              </Paragraph>
              <Tag color={latestReport.status === 'COMPLETED' ? 'blue' : 'gold'}>{latestReport.status}</Tag>
            </Card>
            {renderDeleteButton(latestReport)}
          </div>
        </div>
      )}

      <Title level={4} style={{ color: '#a6adb4', marginBottom: '16px' }}>이전 보고서 목록</Title>
      <Row gutter={[24, 24]}>
        {otherReports.map((report) => (
          <Col key={report._id} xs={24} sm={12} md={8} lg={6}>
            {/* [수정] 이전 카드: wrapper div로 감싸고 삭제 버튼을 추가합니다. */}
            <div className="report-card-wrapper">
                <ChromaCard report={report} onClick={() => handleCardClick(report)}>
                    <FileTextOutlined style={{ fontSize: '28px', color: '#1677ff', marginBottom: '16px' }} />
                    <Title level={5} style={{ color: 'inherit', fontWeight: 600, transition: 'color 0.4s ease' }}>{report.reportTitle || "제목 없음"}</Title>
                    <Paragraph style={{ color: 'inherit', fontSize: '12px', marginBottom: '12px', transition: 'color 0.4s ease' }}>{new Date(report.createdAt).toLocaleString()}</Paragraph>
                    <Tag color={report.status === 'COMPLETED' ? 'green' : 'gold'}>{report.status}</Tag>
                </ChromaCard>
                {renderDeleteButton(report)}
            </div>
          </Col>
        ))}
      </Row>

      <CreateReportModal visible={isModalVisible} onClose={handleModalClose} onSuccess={handleReportCreated} />
    </div>
  );
}

export default ReportList;
