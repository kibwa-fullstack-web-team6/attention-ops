import React from 'react';
import { Layout, Typography } from 'antd';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './components/landingPage';
import ReportList from './components/reportList';
import ReportDetail from './components/reportDetail';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function PageContent() {
  const location = useLocation();
  // [수정] 랜딩 페이지와 보고서 목록 페이지는 다크 레이아웃을 사용하도록 조건을 변경합니다.
  const useDarkLayout = location.pathname === '/' || location.pathname === '/reports';

  const contentStyle = useDarkLayout
    ? { padding: 0 }
    : { padding: '24px 48px', background: '#f0f2f5' };

  const contentWrapperStyle = useDarkLayout
    ? {}
    : { background: '#fff', padding: 24, minHeight: 'calc(100vh - 128px)' };
  
  // 보고서 상세 페이지에만 별도의 헤더/푸터를 보여줍니다.
  const showDashboardHeaderFooter = !useDarkLayout && location.pathname.startsWith('/reports/');

  return (
    <Layout style={{ background: 'transparent' }}>
      {showDashboardHeaderFooter && (
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

      {showDashboardHeaderFooter && (
         <Footer style={{ textAlign: 'center' }}>
            Attention Project ©{new Date().getFullYear()} Created by Hwichan
         </Footer>
      )}
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <PageContent />
    </Router>
  );
}

export default App;
