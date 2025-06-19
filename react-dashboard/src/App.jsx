import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReportList from './components/reportList';
import ReportDetail from './components/reportDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Attention Project - 보고서 대시보드 (Vite)</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<ReportList />} />
            <Route path="/reports/:reportId" element={<ReportDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;