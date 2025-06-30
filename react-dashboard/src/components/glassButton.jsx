import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Glassmorphism 효과와 호버 애니메이션이 적용된 재사용 가능한 버튼 컴포넌트입니다.
 * @param {object} props
 * @param {React.ReactNode} props.children - 버튼 내부에 표시될 텍스트 또는 요소입니다.
 * @param {string} [props.href] - 외부 링크 주소입니다. 이 prop이 있으면 <a> 태그로 렌더링됩니다.
 * @param {string} [props.to] - 내부 라우팅 경로입니다. 이 prop이 있으면 <Link> 태그로 렌더링됩니다.
 */
function GlassButton({ children, href, to, size = 'medium' }) {

  const paddingClasses = size === 'large' ? 'px-10 py-4' : 'px-8 py-3';
  
  const commonClasses = `group relative inline-flex items-center justify-center ${paddingClasses} text-lg font-bold text-white transition-all duration-300 ease-in-out rounded-lg shadow-lg overflow-hidden`;

  // props에 따라 <a> 태그 또는 <Link> 컴포넌트를 동적으로 선택합니다.
  const ButtonComponent = to ? Link : 'a';
  const componentProps = to 
    ? { to } 
    : { href, target: "_blank", rel: "noopener noreferrer" };

  return (
    <ButtonComponent {...componentProps} className={commonClasses}>
      {/* 1. 반투명한 블러 배경 */}
      <span className="absolute inset-0 w-full h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg"></span>
      
      {/* 2. 호버 시 지나가는 빛 효과 */}
      <span className="absolute top-0 right-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-in-out"></span>

      {/* 3. 버튼 텍스트 (효과들 위에 위치하도록 z-index 부여) */}
      <span className="relative z-10">
        {children}
      </span>
    </ButtonComponent>
  );
}

export default GlassButton;
