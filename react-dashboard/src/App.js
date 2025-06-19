import React from 'react';
import ReportList from './components/reportList';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Attention Project - 보고서 대시보드</h1>
      </header>
      <main>
        <ReportList />
      </main>
    </div>
  );
}

export default App;
