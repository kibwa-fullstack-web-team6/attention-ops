import React from 'react';
import { Layout, Typography } from 'antd';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './components/landingPage';
import ReportList from './components/reportList';
import ReportDetail from './components/reportDetail';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

// 실제 페이지 내용을 렌더링하는 컴포넌트
function PageContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  // 랜딩 페이지일 경우, 패딩과 흰색 배경이 없는 Content를 사용합니다.
  const contentStyle = isLandingPage
    ? { padding: 0 }
    : { padding: '24px 48px' };

  const contentWrapperStyle = isLandingPage
    ? {}
    : { background: '#fff', padding: 24, minHeight: 'calc(100vh - 160px)' };

  return (
    <Layout>
      {/* 랜딩 페이지가 아닐 때만 헤더와 푸터를 보여줍니다. */}
      {!isLandingPage && (
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            Attention Project - Dashboard
          </Title>
        </Header>
      )}
      
      <Content style={contentStyle}>
        <div style={contentWrapperStyle}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/reports" element={<ReportList />} />
            <Route path="/reports/:reportId" element={<ReportDetail />} />
          </Routes>
        </div>
      </Content>

      {!isLandingPage && (
         <Footer style={{ textAlign: 'center' }}>
            Attention Project ©{new Date().getFullYear()} Created by Hwichan
         </Footer>
      )}
    </Layout>
  );
}

// App 컴포넌트는 Router를 제공하는 역할만 합니다.
function App() {
  return (
    <Router>
      <PageContent />
    </Router>
  );
}

export default App;