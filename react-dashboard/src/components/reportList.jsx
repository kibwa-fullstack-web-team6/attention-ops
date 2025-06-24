import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Typography, Popconfirm, message } from 'antd';
import axios from 'axios';
import { Link } from 'react-router-dom';

const { Title } = Typography;

function ReportList() {
  console.log("1. ReportList 컴포넌트 렌더링 시작"); // <-- 디버깅 로그 1
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    console.log("2. fetchReports 함수 실행 시작"); // <-- 디버깅 로그 2
    setLoading(true);
    try {
      const response = await axios.get('/api/users/1/reports');
      console.log("3. API 요청 성공! 응답 데이터:", response.data); // <-- 디버깅 로그 3

      if (Array.isArray(response.data)) {
        console.log("4. 데이터가 배열임. map 함수 실행 전."); // <-- 디버깅 로그 4
        const dataWithKeys = response.data.map(item => ({ 
          ...item, 
          key: item._id 
        }));
        console.log("5. map 함수 실행 완료. 상태 업데이트 전 데이터:", dataWithKeys); // <-- 디버깅 로그 5
        setReports(dataWithKeys);
      } else {
        console.error("API 응답이 배열 형식이 아닙니다:", response.data);
        message.error('보고서 데이터 형식이 올바르지 않습니다.');
        setReports([]);
      }
    } catch (error) {
      console.error("API 요청 또는 데이터 처리 중 치명적 에러 발생:", error); // <-- 디버깅 로그 (에러)
      message.error('보고서 목록을 불러오는 데 실패했습니다.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  console.log("6. Table 컴포넌트로 전달될 최종 데이터:", reports); // <-- 디버깅 로그 6
  const columns = [
      // ... columns 배열 정의는 이전과 동일 ...
      {
          title: '보고서 제목',
          dataIndex: 'reportTitle',
          key: 'reportTitle',
          render: (text, record) => <Link to={`/reports/${record._id}`}>{text}</Link>,
      },
      {
          title: '생성일',
          dataIndex: 'createdAt',
          key: 'createdAt',
          render: (text) => new Date(text).toLocaleString(),
      },
      {
          title: '상태',
          dataIndex: 'status',
          key: 'status',
      },
      {
          title: '액션',
          key: 'action',
          render: (_, record) => (
              <Space size="middle">
                  <Popconfirm
                      title="정말로 이 보고서를 삭제하시겠습니까?"
                      onConfirm={() => handleDelete(record._id)}
                      okText="예"
                      cancelText="아니오"
                  >
                      <Button type="primary" danger>삭제</Button>
                  </Popconfirm>
              </Space>
          ),
      },
  ];

  const handleDelete = async (reportId) => {
    // ... handleDelete 함수는 이전과 동일 ...
  };

  return (
    <div>
      <Title level={2}>보고서 대시보드</Title>
      <Button type="primary" style={{ marginBottom: 16 }}>
        보고서 생성
      </Button>
      <Table columns={columns} dataSource={reports} loading={loading} />
    </div>
  );
}

export default ReportList;