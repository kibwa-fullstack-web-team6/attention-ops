// src/App.jsx

import { Layout, Typography } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// [수정] components 폴더를 경로에 추가해줍니다.
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
        <Content style={{ padding: '24px 48px' }}>
          <div style={{ background: '#fff', padding: 24, minHeight: 280 }}>
            <Routes>
              <Route path="/" element={<ReportList />} />
              <Route path="/reports/:reportId" element={<ReportDetail />} />
            </Routes>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Attention Project ©{new Date().getFullYear()} Created by Hwichan
        </Footer>
      </Layout>
    </Router>
  );
}

export default App;