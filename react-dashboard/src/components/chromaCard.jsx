import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './chromaCard.css'; // [수정] import 경로를 소문자로 변경

// 컴포넌트 함수 이름은 PascalCase 규칙을 유지합니다.
function ChromaCard({ report, children }) {
  const cardRef = useRef(null);
  const navigate = useNavigate();

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  };

  const handleClick = () => {
    navigate(`/reports/${report._id}`);
  };

  return (
    <div
      ref={cardRef}
      className="chroma-card"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="chroma-card-content">
        {children}
      </div>
    </div>
  );
}

export default ChromaCard;
