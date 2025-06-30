import React, { useRef } from 'react';
import './chromaCard.css';

// [수정] 부모로부터 onClick 함수를 props로 전달받습니다.
function ChromaCard({ report, children, onClick }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      className="chroma-card"
      onMouseMove={handleMouseMove}
      onClick={onClick} // [수정] 전달받은 onClick 함수를 div의 클릭 이벤트에 연결합니다.
      style={{ cursor: 'pointer' }}
    >
      <div className="chroma-card-content">
        {children}
      </div>
    </div>
  );
}

export default ChromaCard;
