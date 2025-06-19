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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ReportList;
