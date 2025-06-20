import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ReportList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get('/api/users/1/reports');
        setReports(response.data);
      } catch (err) {
        setError('보고서 데이터를 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);
  

    const handleDelete = async (reportId, reportTitle) => {
    // 안전 장치: 사용자에게 정말 삭제할 것인지 한번 더 확인받습니다.
    if (window.confirm(`'${reportTitle}' 보고서를 정말로 삭제하시겠습니까?`)) {
      try {
        // DELETE API를 호출합니다.
        await axios.delete(`/api/reports/${reportId}`);
        
        // API 호출 성공 시, 화면에서도 해당 항목을 즉시 제거합니다.
        // 이렇게 하면 페이지를 새로고침하지 않아도 목록이 실시간으로 업데이트됩니다.
        setReports(reports.filter(report => report._id !== reportId));
        
        alert("보고서가 성공적으로 삭제되었습니다.");
      } catch (err) {
        alert("보고서 삭제에 실패했습니다.");
        console.error(err);
      }
    }
  };


  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error}</div>;

  return (
    <div>
      <h2>생성된 보고서 목록</h2>
      <table>
        <thead>
          <tr>
            <th>보고서 제목</th>
            <th>생성 일시</th>
            <th>상태</th>
            <th>S3 경로</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report._id}>
              <td>
                <Link to={`/reports/${report._id}`}>{report.reportTitle}</Link>
              </td>
              <td>{new Date(report.createdAt).toLocaleString()}</td>
              <td>{report.status}</td>
              <td>{report.s3Path || '생성 중'}</td>
              <td>
                <button onClick={() => handleDelete(report._id, report.reportTitle)}>제거</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ReportList;
