// src/App.jsx

import { Layout, Typography } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// [수정] components 폴더를 경로에 추가해줍니다.
import LandingPage from './components/landingPage'; 
import ReportList from './components/reportList'; 
import ReportDetail from './components/reportDetail';

import './App.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function App() {
  // ... 이하 return 구문은 이전과 동일 ...
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            Attention Project - Dashboard
          </Title>
        </Header>
        <Content style={{ padding: '0 48px' }}>
          <Routes>
            {/* 1. 루트 경로는 이제 LandingPage를 보여줍니다. */}
            <Route path="/" element={<LandingPage />} />
            
            {/* 2. 기존 보고서 목록은 /reports 경로로 접근합니다. */}
            <Route path="/reports" element={<ReportList />} />
            
            {/* 3. 상세 페이지 경로는 그대로 유지합니다. */}
            <Route path="/reports/:reportId" element={<ReportDetail />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Attention Project ©{new Date().getFullYear()} Created by Hwichan
        </Footer>
      </Layout>
    </Router>
  );
}

export default App;