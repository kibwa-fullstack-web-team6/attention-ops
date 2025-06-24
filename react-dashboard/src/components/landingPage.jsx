import React from 'react';
import { Link } from 'react-router-dom'; // Link 컴포넌트 다시 추가

function LandingPage() { // 컴포넌트 이름을 LandingPage로 변경
  // 이미지 최적화 (background-size: cover를 사용하므로 URL 파라미터는 제거합니다.)
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
          {/* 왼쪽 섹션: 로고와 버튼들 */}
          <div className="flex items-center space-x-4"> {/* space-x-4로 버튼과 로고 사이 간격 조정 */}
            <div className="flex items-center space-x-2">
              {/* 로봇 아이콘 (Ant Design 아이콘 대신 인라인 SVG 사용) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-7 h-7 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9.75 9.75m0 0l-3 7.5c0 .712.118 1.412.358 2.072m3.193-9.52c.24-.66.358-1.36.358-2.072M2.25 18.75l7.5-3m6.75 3l7.5-3m-15-6l7.5-3m7.5 3l-7.5 3m-12 3.75v-1.5a1.5 1.5 0 013 0v1.5m-3 0V21a3 3 0 003 3h.75m-9-6h2.25m-1.5 0H7.5m-1.5 0V5.25A2.25 2.25 0 017.5 3h.75m0-1.5h.75m-7.5 0h.75M9 16.5V21a3 3 0 003 3h.75m-9-6h2.25m-1.5 0H7.5m-1.5 0V5.25A2.25 2.25 0 017.5 3h.75m0-1.5h.75M9 16.5V21a3 3 0 003 3h.75"
                />
              </svg>
              <h4 className="text-xl font-semibold text-white">Attention</h4> 
            </div>
            {/* 헤더 링크: 세션 시작 및 보고서 확인 (버튼 스타일 제거) */}
            <a
              href="https://alb.hwichan.shop/mainService"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-blue-400 transition duration-300 ease-in-out px-3 py-2 rounded-md font-medium"
            >
              세션 시작
            </a>
            <Link
              to="/reports"
              className="text-white hover:text-blue-400 transition duration-300 ease-in-out px-3 py-2 rounded-md font-medium"
            >
              보고서 확인
            </Link>
          </div>
          {/* 오른쪽 섹션: 로그인/회원가입 등을 위해 비워둠 (flex-grow로 공간 확보) */}
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
            {/* 블러 텍스트 애니메이션 적용 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-white
                          animate-fade-in-blur">
              최고의 집중력을 깨우세요
            </h1>
            {/* 윗줄이 나타난 다음 천천히 나타나도록 애니메이션 적용 */}
            <p className="text-lg md:text-xl text-gray-300 mb-8
                          animate-fade-in-blur-delayed">
              AI의 힘을 활용하여 실시간으로 집중력을 분석하고, 맞춤형 코칭을 통해 집중력을 향상시키세요.
            </p>
            {/* 메인 페이지 중앙 버튼 */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
              <a
                href="https://alb.hwichan.shop/mainService"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition duration-300 ease-in-out"
              >
                세션 시작
              </a>
              <Link
                to="/reports"
                className="px-8 py-3 bg-transparent border border-white hover:bg-white hover:text-blue-600 text-white font-semibold rounded-lg shadow-lg transition duration-300 ease-in-out"
              >
                보고서 확인
              </Link>
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
                {/* 눈 아이콘 (인라인 SVG) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="w-10 h-10 text-blue-500 mb-4 mx-auto"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h4 className="text-xl font-semibold mb-2 text-white">실시간 분석</h4>
                <p className="text-gray-400">
                  작업하는 동안 집중도에 대한 즉각적인 피드백을 받아 실시간으로 조절할 수 있습니다.
                </p>
              </div>

              {/* 기능 카드 2 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700">
                {/* 라인 차트 아이콘 (인라인 SVG) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="w-10 h-10 text-blue-500 mb-4 mx-auto"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186A9.75 9.75 0 0112 15.75c6.12 0 11.22-4.14 11.72-9.75M7.217 10.907v7.286m0-7.286a9.75 9.75 0 01-6.72-2.186m6.72 2.186l-1.453 2.585m0 0a9.75 9.75 0 01-2.186 6.724m6.724 0H4.217m6.724 0v-7.286m6.724 0a9.75 9.75 0 00-6.72-2.186m0 2.186l1.453 2.585m0 0a9.75 9.75 0 002.186 6.724m-2.186 0h2.186m-2.186 0h2.186m-6.724 0v-7.286"
                  />
                </svg>
                <h4 className="text-xl font-semibold mb-2 text-white">상세 보고서</h4>
                <p className="text-gray-400">
                  시간 경과에 따른 집중 패턴을 분석하는 종합 보고서에 액세스하여 주요 추세 및 통찰력을 식별합니다.
                </p>
              </div>

              {/* 기능 카드 3 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700">
                {/* 로봇 아이콘 (인라인 SVG) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="w-10 h-10 text-blue-500 mb-4 mx-auto"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9.75 9.75m0 0l-3 7.5c0 .712.118 1.412.358 2.072m3.193-9.52c.24-.66.358-1.36.358-2.072M2.25 18.75l7.5-3m6.75 3l7.5-3m-15-6l7.5-3m7.5 3l-7.5 3m-12 3.75v-1.5a1.5 1.5 0 013 0v1.5m-3 0V21a3 3 0 003 3h.75m-9-6h2.25m-1.5 0H7.5m-1.5 0V5.25A2.25 2.25 0 017.5 3h.75m0-1.5h.75m-7.5 0h.75M9 16.5V21a3 3 0 003 3h.75m-9-6h2.25m-1.5 0H7.5m-1.5 0V5.25A2.25 2.25 0 017.5 3h.75m0-1.5h.75M9 16.5V21a3 3 0 003 3h.75"
                  />
                </svg>
                <h4 className="text-xl font-semibold mb-2 text-white">AI 코칭</h4>
                <p className="text-gray-400">
                  집중력 향상을 위한 특정 요구 사항과 목표에 맞춰 AI 어시스턴트로부터 맞춤형 코칭을 받으세요.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 작동 방식 섹션 */}
        <section className="px-4 py-16 md:py-24 lg:py-32 bg-[#0e161f] rounded-lg">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-12 text-white">작동 방식</h2>
            {/* 시각적으로 재구성된 작동 방식 타임라인 */}
            <div className="relative flex flex-col md:flex-row justify-between items-stretch mx-auto max-w-4xl">
              {/* 가로선 (데스크탑에서만 표시) */}
              <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[30px] w-[calc(100%-8rem)] h-0.5 bg-gray-700"></div>

              {howItWorksSteps.map((step, index) => (
                <div key={index} className="relative z-10 flex flex-col items-center text-center p-4 md:w-1/3 flex-shrink-0">
                  {/* 타임라인 점 */}
                  <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex-shrink-0 mb-4 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
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
              {/* 후기 카드 1 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700 flex flex-col items-center text-center">
                <img
                  src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVX.png"
                  alt="Avatar"
                  className="w-20 h-20 rounded-full mb-4 object-cover border-2 border-blue-500"
                />
                <p className="text-lg italic text-gray-300 mb-4">
                  "Attention은 저의 생산성을 완전히 바꿔 놓았습니다. 실시간 분석으로 흐름을 유지하고, 보고서는 집중 패턴에 대한 귀중한 통찰력을 제공합니다."
                </p>
                <p className="font-semibold text-white">- 사라, 소프트웨어 엔지니어</p>
              </div>

              {/* 후기 카드 2 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700 flex flex-col items-center text-center">
                <img
                  src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniV.png"
                  alt="Avatar"
                  className="w-20 h-20 rounded-full mb-4 object-cover border-2 border-blue-500"
                />
                <p className="text-lg italic text-gray-300 mb-4">
                  "AI 코칭 기능이 정말 마음에 듭니다. 마치 개인 집중력 코치가 있는 것 같아요. 덕분에 집중력이 크게 향상되었습니다!"
                </p>
                <p className="font-semibold text-white">- 데이비드, 학생</p>
              </div>

              {/* 후기 카드 3 */}
              <div className="bg-[#1a232e] p-8 rounded-lg shadow-xl hover:shadow-2xl transition duration-300 ease-in-out border border-gray-700 flex flex-col items-center text-center">
                <img
                  src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVX.png"
                  alt="Avatar"
                  className="w-20 h-20 rounded-full mb-4 object-cover border-2 border-blue-500"
                />
                <p className="text-lg italic text-gray-300 mb-4">
                  "상세 보고서가 정말 도움이 됩니다. 언제 집중력이 떨어지는지 정확히 알 수 있고, 그 문제를 해결하기 위해 무엇을 해야 하는지도 알 수 있습니다."
                </p>
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
            <a href="#" className="hover:text-white transition duration-300 ease-in-out">
              개인정보처리방침
            </a>
            <a href="#" className="hover:text-white transition duration-300 ease-in-out">
              서비스 약관
            </a>
            <a href="#" className="hover:text-white transition duration-300 ease-in-out">
              문의하기
            </a>
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} Attention. 모든 권리 보유.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage; // LandingPage 컴포넌트를 export
