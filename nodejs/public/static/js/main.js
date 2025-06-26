// --- 1. 전역 변수 및 상수 선언 ---

// 시각적 요소
const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("faceCanvas");
const videoContainer = document.getElementById("video-container");
const canvasCtx = canvasElement.getContext("2d");
const statusElement = document.getElementById("status");
const quoteElement = document.getElementById("quote-display"); // 명언 표시 요소 추가

// 컨트롤 패널 요소
const sessionTimerDisplay = document.getElementById("sessionTimerDisplay");
const toggleCameraButton = document.getElementById("toggle-camera");
const pauseResumeButton = document.getElementById("pause-resume");
const endSessionButton = document.getElementById("end-session"); 
const warningLog = document.getElementById("warningLog");
const warningList = document.getElementById("warningList");
const toggleWarningListButton = document.getElementById("toggleWarningList"); 

// 종료 확인 모달 요소
const endSessionModal = document.getElementById("endSessionModal");
const confirmEndSessionButton = document.getElementById("confirmEndSession");
const cancelEndSessionButton = document.getElementById("cancelEndSession");


// MediaPipe 및 비디오 상태 플래그
let isFaceMeshInitialized = false;
let isVideoPlaying = false;
let latestLandmarks = [];

// WebSocket 관련 변수 및 세션 ID
const WEBSOCKET_URL = `wss://${window.location.hostname}/ws`;
let websocket;
const SESSION_ID = crypto.randomUUID();
const USER_ID = "1";

// 상태 추적 변수
let isPaused = false;
let isCameraVisible = false; 
let sessionStartTime;
let sessionTimerInterval;
let elapsedPausedTime = 0;
let pauseStartTime;

// 오디오 컨텍스트 (경고음용)
let audioCtx;

// 명언 목록
const QUOTES = [
    { quote: "가장 큰 영광은 한 번도 실패하지 않음이 아니라 \n 실패할 때마다 다시 일어서는 데에 있다.", author: "공자" },
    { quote: "성공의 비결은 단 한 가지, \n 잘할 수 있는 일에 광적으로 집중하는 것이다.", author: "톰 모나건" },
    { quote: "오직 한 가지 성공이 있을 뿐이다. \n 바로 자기 자신만의 방식으로 삶을 살아갈 수 있느냐이다.", author: "크리스토퍼 몰리" },
    { quote: "집중력은 지성의 또 다른 이름이다.", author: "아서 쇼펜하우어" },
    { quote: "천 리 길도 한 걸음부터.", author: "노자" },
    { quote: "당신이 할 수 있다고 믿든 할 수 없다고 믿든,\n 믿는 대로 될 것이다.", author: "헨리 포드"},
    { quote: "오늘 할 수 있는 일에 전력을 다하라.\n 그러면 내일에는 한 걸음 더 진보해 있을 것이다.", author: "아이작 뉴턴"}
];


// 핵심 랜드마크 인덱스 목록
const KEY_LANDMARK_INDICES = [1, 6, 10, 13, 14, 33, 61, 81, 133, 144, 152, 153, 158, 160, 178, 234, 263, 291, 311, 362, 373, 380, 385, 387, 402, 454];

// SVG 아이콘
const PAUSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const CAMERA_ON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;
const CAMERA_OFF_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22"></path><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"></path></svg>`;
const WARNING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" x2="12" y1="9" y2="13"></line><line x1="12" x2="12.01" y1="17" y2="17"></line></svg>`;
const END_SESSION_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect></svg>`;


// MediaPipe 인스턴스 생성
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
faceMesh.onResults(onResults);


// --- 2. 핵심 로직 함수들 ---

function playWarningBeep() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.error("경고음 재생 실패: Web Audio API가 지원되지 않거나 에러가 발생했습니다.", e);
    }
}


function onResults(results) {
    if (isPaused) {
        latestLandmarks = []; 
        return;
    }

    latestLandmarks = results.multiFaceLandmarks[0] || [];

    if (latestLandmarks.length > 0) {
        const keyLandmarks = KEY_LANDMARK_INDICES.map(index => {
            const landmark = latestLandmarks[index];
            return { index, x: parseFloat(landmark.x.toFixed(4)), y: parseFloat(landmark.y.toFixed(4)), z: parseFloat(landmark.z.toFixed(4)) };
        });
        sendEvent('data', { landmarks: keyLandmarks });
    } else {
        sendEvent('status_update', { status: 'no_face_detected' });
    }
}


let lastProcessTime = 0;
const processInterval = 1000;

async function mainLoop(currentTime) {
    requestAnimationFrame(mainLoop);

    if (isVideoPlaying && videoElement.readyState >= 3) {
        if (isCameraVisible) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            
            if (latestLandmarks.length > 0) {
                for (const index of KEY_LANDMARK_INDICES) {
                    const landmark = latestLandmarks[index];
                    if (landmark) {
                        const x = landmark.x * canvasElement.width;
                        const y = landmark.y * canvasElement.height;
                        canvasCtx.beginPath();
                        canvasCtx.arc(x, y, 2.5, 0, 2 * Math.PI);
                        canvasCtx.fillStyle = isPaused ? '#FFA500' : '#30FF30';
                        canvasCtx.fill();
                    }
                }
            }
            canvasCtx.restore();
        } else {
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        }
        
        if (!isPaused && isFaceMeshInitialized && (currentTime - lastProcessTime > processInterval)) {
            lastProcessTime = currentTime;
            await faceMesh.send({ image: videoElement });
        }
    }
}


// --- 3. 초기화 및 이벤트 핸들러 ---
async function initializeWebcam() {
    console.log("🟢 웹캠 초기화 시작.");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
        videoElement.srcObject = stream;
        
        videoElement.addEventListener("playing", () => {
            console.log("🟢 비디오 재생 시작됨. 메인 루프 시작.");
            isVideoPlaying = true;
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            requestAnimationFrame(mainLoop);
        }, { once: true });

    } catch (error) {
        console.error("🔴 웹캠 활성화 실패:", error);
        statusElement.textContent = "웹캠을 켤 수 없습니다. 권한을 확인해주세요.";
    }
}

async function initializeMediaPipe() {
    console.log("🟢 MediaPipe 초기화 시작.");
    statusElement.textContent = "AI 모델 로드 중...";
    await faceMesh.initialize();
    isFaceMeshInitialized = true;
    console.log("🟢 MediaPipe 모델 초기화 완료.");
}

function connectWebSocket() {
    console.log(`🟡 WebSocket 연결 시도: ${WEBSOCKET_URL}`);
    statusElement.textContent = "실시간 분석 서버에 연결 중...";
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
        console.log('✅ WebSocket 연결 성공.');
        const initialMessage = "얼굴을 보여주세요.";
        statusElement.textContent = initialMessage;
        
        setTimeout(() => {
            if (statusElement.textContent === initialMessage) {
                statusElement.textContent = "집중 분석 중";
            }
        }, 5000);

        sendEvent('start', { userAgent: navigator.userAgent });
    };

    websocket.onmessage = (event) => {
        const alarmMessage = event.data; 
        console.log(`🔔 서버로부터 메시지 수신: ${alarmMessage}`);
        statusElement.textContent = `🚨 ${alarmMessage}`;
        addWarningToList(alarmMessage); // 여기에 경고가 추가될 것
        playWarningBeep();

        Toastify({
            text: `🚨 ${alarmMessage}`,
            duration: 3000,
            newWindow: true,
            close: true,
            gravity: "top", 
            position: "right", 
            stopOnFocus: true,
        }).showToast();
    };

    websocket.onclose = () => {
        console.log('🔌 WebSocket 연결이 종료되었습니다. 5초 후 재연결을 시도합니다.');
        statusElement.textContent = "서버와 연결이 끊겼습니다. 재연결 중...";
        setTimeout(connectWebSocket, 5000);
    };

    websocket.onerror = (error) => {
        console.error('🔴 WebSocket 에러 발생:', error);
        statusElement.textContent = "연결 에러가 발생했습니다.";
        websocket.close();
    };
}

function sendEvent(eventType, payload) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
    const message = { sessionId: SESSION_ID, userId: USER_ID, timestamp: new Date().toISOString(), eventType: eventType, payload: payload };
    websocket.send(JSON.stringify(message));
}

function addWarningToList(message) {
    console.log("addWarningToList 호출됨. 메시지:", message); // 디버깅용 로그
    if (!warningLog) {
        console.error("warningLog 요소를 찾을 수 없습니다.");
        return;
    }
    const p = document.createElement('p');
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    p.innerHTML = `<span class="font-mono text-gray-500">[${time}]</span> ${message}`;
    warningLog.prepend(p);
    console.log("경고 메시지 추가됨:", p); // 디버깅용 로그
}

function updateSessionTimer() {
    if (!sessionStartTime || isPaused) return;
    const now = new Date();
    const elapsed = new Date(now - sessionStartTime - elapsedPausedTime);
    const hours = String(elapsed.getUTCHours()).padStart(2, '0');
    const minutes = String(elapsed.getUTCMinutes()).padStart(2, '0');
    const seconds = String(elapsed.getUTCSeconds()).padStart(2, '0');
    sessionTimerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}

function toggleCameraVisibility() {
    isCameraVisible = !isCameraVisible;
    if (isCameraVisible) {
        videoContainer.classList.remove('opacity-0');
        videoContainer.classList.remove('pointer-events-none'); 
        toggleCameraButton.innerHTML = CAMERA_ON_ICON;
        quoteElement.classList.add('opacity-0'); 
    } else {
        videoContainer.classList.add('opacity-0');
        videoContainer.classList.add('pointer-events-none'); 
        toggleCameraButton.innerHTML = CAMERA_OFF_ICON;
        quoteElement.classList.remove('opacity-0'); 
    }
}

function togglePauseState() {
    isPaused = !isPaused;
    pauseResumeButton.innerHTML = isPaused ? PLAY_ICON : PAUSE_ICON;
    statusElement.textContent = isPaused ? "⏸️ 일시정지됨" : "집중 분석 중";
    const eventType = isPaused ? 'paused' : 'resumed';
    sendEvent('status_update', { status: eventType });

    if (isPaused) {
        pauseStartTime = new Date();
    } else {
        elapsedPausedTime += new Date() - pauseStartTime;
    }
}

function endSession() {
    sendEvent('end', { reason: 'user_clicked_end_button' });
    statusElement.textContent = "세션을 종료합니다...";
    clearInterval(sessionTimerInterval); 
    if(videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
    if (websocket) {
        websocket.close();
    }
    setTimeout(() => { window.location.href = "/"; }, 500);
}

/**
* 모든 기능을 시작하는 메인 진입점 함수
*/
function startApp() {
    console.log("🟢 애플리케이션 시작.");
    
    // 페이지 로드 시 랜덤 명언 표시
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    quoteElement.innerHTML = `
        <h2 class="text-3xl font-bold mb-4">"${randomQuote.quote}"</h2>
        <p class="text-xl text-gray-400">- ${randomQuote.author} -</p>
    `;
    
    // 초기 상태 설정: 카메라 컨테이너는 숨김, 명언은 보임
    videoContainer.classList.add('opacity-0', 'pointer-events-none');
    quoteElement.classList.remove('opacity-0');

    // 초기 아이콘 설정 
    pauseResumeButton.innerHTML = PAUSE_ICON;
    toggleCameraButton.innerHTML = CAMERA_OFF_ICON; 

    setTimeout(connectWebSocket, 0);
    setTimeout(initializeWebcam, 0);
    setTimeout(initializeMediaPipe, 0);

    sessionStartTime = new Date();
    sessionTimerInterval = setInterval(updateSessionTimer, 1000);

    // --- 이벤트 리스너 등록 --- 
    toggleCameraButton.addEventListener('click', toggleCameraVisibility); 
    pauseResumeButton.addEventListener('click', togglePauseState); 

    endSessionButton.addEventListener('click', () => { 
        endSessionModal.classList.remove("opacity-0", "pointer-events-none"); 
    }); 
    
    confirmEndSessionButton.addEventListener('click', () => { 
        endSessionModal.classList.add("opacity-0", "pointer-events-none"); 
        endSession(); 
    }); 

    cancelEndSessionButton.addEventListener('click', () => { 
        endSessionModal.classList.add("opacity-0", "pointer-events-none"); 
    }); 

    // 경고 리스트 확인 버튼 이벤트 리스너
    toggleWarningListButton.addEventListener('click', () => { 
        console.log("경고 리스트 토글 버튼 클릭됨"); // 디버깅용 로그 추가
        const isHidden = warningList.classList.contains('opacity-0'); 
        if (isHidden) { 
            console.log("경고 리스트 보이기: opacity-0, scale-95, pointer-events-none 클래스 제거"); // 디버깅용 로그 추가
            warningList.classList.remove('opacity-0', 'scale-95', 'pointer-events-none'); 
        } else { 
            console.log("경고 리스트 숨기기: opacity-0, scale-95, pointer-events-none 클래스 추가"); // 디버깅용 로그 추가
            warningList.classList.add('opacity-0', 'scale-95', 'pointer-events-none'); 
        } 
    }); 
} 

// --- 애플리케이션 실행 --- 

document.addEventListener("DOMContentLoaded", startApp); 

window.addEventListener('beforeunload', (event) => { 
    if (websocket && websocket.readyState === WebSocket.OPEN) { 
        sendEvent('end', { reason: 'user_closed_tab' }); 
    } 
});