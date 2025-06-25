import React from 'react';
import { Link } from 'react-router-dom';
import GlassButton from './glassButton'; // 새로 만든 GlassButton을 import 합니다.

function LandingPage() {
  const heroBgImage = 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?q=80&w=2070&auto=format'; 

  const howItWorksSteps = [
    {
      title: "웹캠 연결",
      description: "Attention 플랫폼에 웹캠을 연결합니다."
    },
    {
      title: "세션 시작",
      description: "집중력 세션을 시작하고 AI가 실시간으로 집중력을 분석하도록 합니다."
    },
    {
      title: "보고서 받기",
      description: "통찰력과 맞춤형 코칭 팁이 포함된 상세 보고서를 받으세요."
    }
  ];

  return (
    <div className="min-h-screen bg-[#101923] text-white font-inter">
      {/* Header Section */}
      <header className="px-4 py-4 md:px-8 lg:px-12 bg-[#101923] shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9.75 9.75m0 0l-3 7.5c0 .712.118 1.412.358 2.072m3.193-9.52c.24-.66.358-1.36.358-2.072M2.25 18.75l7.5-3m6.75 3l7.5-3m-15-6l7.5-3m7.5 3l-7.5 3m-12 3.75v-1.5a1.5 1.5 0 013 0v1.5m-3 0V21a3 3 0 003 3h.75m-9-6h2.25m-1.5 0H7.5m-1.5 0V5.25A2.25 2.25 0 017.5 3h.75m0-1.5h.75m-7.5 0h.75M9 16.5V21a3 3 0 003 3h.75m-9-6h2.25m-1.5 0H7.5m-1.5 0V5.25A2.25 2.25 0 017.5 3h.75m0-1.5h.75M9 16.5V21a3 3 0 003 3h.75" />
              </svg>
              <h4 className="text-xl font-semibold text-white">Attention</h4> 
            </div>
            <a href="https://alb.hwichan.shop/mainService" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-400 transition duration-300 ease-in-out px-3 py-2 rounded-md font-medium">
              세션 시작
            </a>
            <Link to="/reports" className="text-white hover:text-blue-400 transition duration-300 ease-in-out px-3 py-2 rounded-md font-medium">
              보고서 확인
            </Link>
          </div>
          <div className="flex-grow"></div> 
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* 히어로 섹션 */}
        <section
          className="relative group flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 lg:py-48 bg-cover bg-center rounded-b-lg overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(rgba(16, 25, 35, 0.7) 0%, #101923 100%), url(${heroBgImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#101923] to-transparent z-0"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-white animate-fade-in-blur">
              최고의 집중력을 깨우세요
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 opacity-0 blur-2xl animate-fade-in-blur-delayed">
              AI의 힘을 활용하여 실시간으로 집중력을 분석하고, 맞춤형 코칭을 통해 집중력을 향상시키세요.
            </p>
            {/* [수정] 메인 페이지 중앙 버튼을 GlassButton으로 교체합니다. */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center mt-32">
              <GlassButton href="https://alb.hwichan.shop/mainService" size="large">
                세션 시작하기
              </GlassButton>
              <GlassButton to="/reports" size="large">
                보고서 확인하기
              </GlassButton>
            </div>  
          </div>
        </section>

        {/* 주요 기능 섹션 */}
        <section className="px-4 py-16 md:py-24 lg:py-32">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">주요 기능</h2>
            <p className="text-md md:text-lg text-gray-300 mb-12">
              Attention은 집중력을 이해하고 향상시키는 데 도움이 되는 다양한 도구를 제공합니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 기능 카드 1 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-10 h-10 text-blue-500 mb-4 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h4 className="text-xl font-semibold mb-2 text-white">실시간 피드백</h4>
                <p className="text-gray-400">세션에서 작업하는 동안 집중도에 대한 즉각적인 피드백을 받아 실시간으로 집중 상태를 개선할 수 있습니다.</p>
              </div>

              {/* 기능 카드 2 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-blue-500 mb-4 mx-auto">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill="#3B82F6" stroke="#2563EB" strokeWidth="1.5"></rect>
                  <rect x="5.5" y="3.5" width="13" height="7" rx="0.5" ry="0.5" fill="white" stroke="#2563EB" strokeWidth="0.8"></rect>
                  <rect x="6.5" y="7.5" width="1.5" height="3" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.5"></rect>
                  <rect x="9" y="5.5" width="1.5" height="5" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.5"></rect>
                  <rect x="11.5" y="8.5" width="1.5" height="2" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.5"></rect>
                  <rect x="14" y="6.5" width="1.5" height="4" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.5"></rect>
                  <rect x="16.5" y="7" width="1.5" height="3.5" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.5"></rect>
                  <line x1="6" y1="13" x2="11" y2="13" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round"></line>
                  <line x1="6" y1="15" x2="10" y2="15" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round"></line>
                  <line x1="6" y1="17" x2="11" y2="17" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round"></line>
                  <line x1="6" y1="19" x2="10" y2="19" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round"></line>
                  <circle cx="15.5" cy="16.5" r="3.5" fill="#60A5FA" stroke="#2563EB" strokeWidth="0.8"></circle>
                  <path d="M15.5 16.5 L15.5 13 A3.5 3.5 0 0 1 18 15.5 Z" fill="white" stroke="#2563EB" strokeWidth="0.8"></path>
                </svg>
                <h4 className="text-xl font-semibold mb-2 text-white">종합 보고서</h4>
                <p className="text-gray-400">여러 세션을 망라한 보고서를 생성, 액세스하여 당신의 집중도를 종합해 분석합니다.</p>
              </div>

              {/* 기능 카드 3 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700 flex flex-col text-center">
                <div className="h-12 w-full mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot text-blue-500">
                    <rect x="5" y="5" width="14" height="14" rx="2" ry="2" fill="#60A5FA" stroke="#2563EB"></rect>
                    <line x1="12" y1="5" x2="12" y2="3" stroke="#2563EB"></line>
                    <circle cx="12" cy="2.5" r="0.8" fill="#60A5FA" stroke="#2563EB" stroke-width="1"></circle>
                    <path d="M4 11h1M19 11h1" stroke="#2563EB" stroke-width="1.5"></path>
                    <circle cx="9" cy="10" r="1.2" fill="#2563EB" stroke="none"></circle>
                    <circle cx="15" cy="10" r="1.2" fill="#2563EB" stroke="none"></circle>
                    <path d="M9 13.5c1 1 4 1 6 0" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" fill="none"></path>
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-2 text-white">AI 코칭</h4>
                <p className="text-gray-400">보고서 내용을 기반으로, AI가 당신의 집중력에 대한 코칭 피드백을 제공합니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 작동 방식 섹션 */}
        <section className="px-4 py-16 md:py-24 lg:py-32 bg-[#0e161f] rounded-lg">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-12 text-white">작동 방식</h2>
            <div className="relative flex flex-col md:flex-row justify-between items-stretch mx-auto max-w-4xl">
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[30px] w-[calc(100%-8rem)] h-0.5 bg-gray-700"></div>
              {howItWorksSteps.map((step, index) => (
                <div key={index} className="relative z-10 flex flex-col items-center text-center p-4 md:w-1/3 flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex-shrink-0 mb-4 flex items-center justify-center text-sm font-bold">{index + 1}</div>
                  <h3 className="text-xl font-semibold mb-1 text-white">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 사용자 후기 섹션 */}
        <section className="px-4 py-16 md:py-24 lg:py-32">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-12 text-white">사용자 후기</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700 flex flex-col items-center text-center">
                <p className="text-lg italic text-gray-300 mb-4">"Attention은 저의 생산성을 완전히 바꿔 놓았습니다. 실시간 분석으로 흐름을 유지하고, 보고서는 집중 패턴에 대한 귀중한 통찰력을 제공합니다."</p>
                <p className="font-semibold text-white">- 사라, 소프트웨어 엔지니어</p>
              </div>
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700 flex flex-col items-center text-center">
                <p className="text-lg italic text-gray-300 mb-4">"AI 코칭 기능이 정말 마음에 듭니다. 마치 개인 집중력 코치가 있는 것 같아요. 덕분에 집중력이 크게 향상되었습니다!"</p>
                <p className="font-semibold text-white">- 데이비드, 학생</p>
              </div>
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700 flex flex-col items-center text-center">
                <p className="text-lg italic text-gray-300 mb-4">"상세 보고서가 정말 도움이 됩니다. 언제 집중력이 떨어지는지 정확히 알 수 있고, 그 문제를 해결하기 위해 무엇을 해야 하는지도 알 수 있습니다."</p>
                <p className="font-semibold text-white">- 에밀리, 작가</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 섹션 */}
      <footer className="px-4 py-8 md:py-12 bg-[#0e161f] text-gray-400 text-center rounded-t-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex space-x-6">
            <a href="#" className="hover:text-white transition duration-300 ease-in-out">개인정보처리방침</a>
            <a href="#" className="hover:text-white transition duration-300 ease-in-out">서비스 약관</a>
            <a href="#" className="hover:text-white transition duration-300 ease-in-out">문의하기</a>
          </div>
          <div className="text-sm">© {new Date().getFullYear()} Attention. 모든 권리 보유.</div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
