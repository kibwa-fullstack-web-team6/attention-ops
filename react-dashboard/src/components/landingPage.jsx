import React from 'react';
import { Link } from 'react-router-dom';
import { Layout, Button, Typography, Row, Col, Card, Space } from 'antd';
import { EyeOutlined, LineChartOutlined, RobotOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

// 인라인 스타일 정의
const heroStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '50vh',
  background: '#f0f2f5', // 밝은 회색 배경
  textAlign: 'center',
  padding: '2rem'
};

const sectionStyle = {
  padding: '50px 0',
  textAlign: 'center'
};

function LandingPage() {
  return (
    <Content>
      {/* 1. Hero Section */}
      <div style={heroStyle}>
        <Title level={1} style={{ marginBottom: '1rem' }}>
          AI 학습 코치와 함께 최고의 집중력을 경험하세요
        </Title>
        <Paragraph style={{ fontSize: '1.2rem', maxWidth: '600px' }}>
          'Attention' 프로젝트는 실시간 웹캠 분석을 통해 당신의 학습 습관을 파악하고,
          개인화된 AI 코칭으로 최상의 학습 효율을 이끌어냅니다.
        </Paragraph>
        <Space size="large" style={{ marginTop: '2rem' }}>
          <Button 
            type="primary" 
            size="large" 
            href="https://web.hwichan.shop/mainService" // nodejs-app의 세션 페이지로 바로 연결
            target="_blank" // 새 탭에서 열기
          >
            실시간 세션 시작하기
          </Button>
          <Button size="large">
            <Link to="/reports">보고서 대시보드 보기</Link>
          </Button>
        </Space>
      </div>

      {/* 2. Features Section */}
      <div style={sectionStyle}>
        <Title level={2}>주요 기능</Title>
        <Row gutter={[32, 32]} justify="center" style={{ marginTop: '40px' }}>
          <Col xs={24} sm={12} md={8}>
            <Card title="실시간 집중도 분석" bordered={false}>
              <EyeOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <p style={{ marginTop: '16px' }}>웹캠을 통해 당신의 상태(하품, 졸음, 주의 분산)를 실시간으로 분석하고 피드백을 드립니다.</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card title="상세 분석 리포트" bordered={false}>
              <LineChartOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <p style={{ marginTop: '16px' }}>세션이 끝나면, 상세한 통계와 차트로 당신의 학습 패턴을 되돌아볼 수 있습니다.</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card title="개인화된 AI 코칭" bordered={false}>
              <RobotOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              <p style={{ marginTop: '16px' }}>우리가 직접 훈련시킨 AI 코치가 당신만을 위한 따뜻한 조언과 격려를 해줍니다.</p>
            </Card>
          </Col>
        </Row>
      </div>
      
      {/* 여기에 기술 스택 섹션 등을 추가할 수 있습니다. */}
    </Content>
  );
}

export default LandingPage;