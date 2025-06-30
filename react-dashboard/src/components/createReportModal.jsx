import React, { useState } from 'react';
import { Modal, Form, Input, DatePicker, message } from 'antd';
import axios from 'axios';

const { RangePicker } = DatePicker;

/**
 * 새 보고서 생성을 위한 모달 컴포넌트입니다.
 * @param {object} props
 * @param {boolean} props.visible - 모달의 표시 여부
 * @param {function} props.onClose - 모달을 닫을 때 호출되는 함수
 * @param {function} props.onSuccess - 보고서 생성 요청 성공 시 호출되는 함수
 */
function CreateReportModal({ visible, onClose, onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // '생성' 버튼을 눌렀을 때 실행되는 함수
  const handleCreate = async (values) => {
    setLoading(true);
    try {
      // FastAPI가 요구하는 형식에 맞춰 데이터를 구성합니다.
      const payload = {
        userId: "1", // 요구사항에 따라 '1'로 고정
        reportTitle: values.reportTitle,
        // antd의 RangePicker는 moment 객체 배열을 반환하므로, ISO 문자열로 변환합니다.
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
      };
      
      await axios.post('/api/reports', payload);
      message.success('보고서 생성을 성공적으로 요청했습니다. 잠시 후 목록이 갱신됩니다.');
      
      onSuccess(); // 부모 컴포넌트(reportList)의 목록 새로고침 함수 호출
      onClose();   // 모달 닫기
      form.resetFields(); // 다음 사용을 위해 폼 필드 초기화
    } catch (error) {
      message.error('보고서 생성 요청에 실패했습니다.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      title="새 보고서 생성"
      okText="생성"
      cancelText="취소"
      onCancel={onClose}
      onOk={() => {
        form
          .validateFields()
          .then(values => {
            handleCreate(values);
          })
          .catch(info => {
            console.log('유효성 검사 실패:', info);
          });
      }}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        name="create_report_form"
      >
        <Form.Item
          name="reportTitle"
          label="보고서 제목"
          rules={[{ required: true, message: '보고서 제목을 입력해주세요!' }]}
        >
          <Input placeholder="예: 6월 4주차 학습 분석 보고서" />
        </Form.Item>
        <Form.Item
          name="dateRange"
          label="분석 기간"
          rules={[{ required: true, message: '분석 기간을 선택해주세요!' }]}
        >
          <RangePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default CreateReportModal;
