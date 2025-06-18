// --- 1. 전역 변수 및 상수 선언 ---

// 시각적 요소
const videoElement = document.getElementById("webcam-video");
const canvasElement = document.getElementById("landmark-canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusElement = document.getElementById("status");

// 컨트롤 패널 요소
const sessionTimerDisplay = document.getElementById("session-timer-display");
const pauseResumeButton = document.getElementById("pause-resume-button");
const endSessionButton = document.getElementById("end-session-button");
const warningList = document.getElementById("warning-list");
const toggleWarningListButton = document.getElementById("toggle-warning-list-button");

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
let sessionStartTime;
let sessionTimerInterval;

// 핵심 랜드마크 인덱스 목록
const KEY_LANDMARK_INDICES = [1, 6, 10, 13, 14, 33, 61, 81, 133, 144, 152, 153, 158, 160, 178, 234, 263, 291, 311, 362, 373, 380, 385, 387, 402, 454];

// MediaPipe 인스턴스 생성
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
faceMesh.onResults(onResults);


// --- 2. 핵심 로직 함수들 ---

function onResults(results) {
    // ✨ 일시정지 상태일 때는 랜드마크 데이터 처리 및 전송을 모두 중단합니다.
    if (isPaused) {
        latestLandmarks = []; // 랜드마크 그리기도 멈추도록 데이터를 비웁니다.
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
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        if (latestLandmarks.length > 0) {
            const keyLandmarksToDraw = KEY_LANDMARK_INDICES.map(index => latestLandmarks[index]);
            for (const landmark of keyLandmarksToDraw) {
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        videoElement.srcObject = stream;
        videoElement.addEventListener("loadeddata", () => {
            videoElement.play();
        });
        videoElement.addEventListener("playing", () => {
            console.log("🟢 비디오 재생 시작됨. 메인 루프 시작.");
            isVideoPlaying = true;
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            requestAnimationFrame(mainLoop);
        }, { once: true });
    } catch (error) {
        console.error("🔴 웹캠 활성화 실패:", error);
        statusElement.textContent = "웹캠을 켤 수 없습니다. 카메라 권한을 확인해주세요.";
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
    console.log(`🟡 WebSocket 연결 시도.`);
    statusElement.textContent = "실시간 분석 서버에 연결 중...";
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
        console.log('✅ WebSocket 연결 성공.');
        statusElement.textContent = "연결 성공! 얼굴을 보여주세요.";
        sendEvent('start', { userAgent: navigator.userAgent });
    };

    websocket.onmessage = (event) => {
        console.log(`🔔 서버로부터 메시지 수신: ${event.data}`);
        statusElement.textContent = `🚨 서버 알람: ${event.data}`;
        addWarningToList(event.data);
    };

    websocket.onclose = () => {
        console.log('🔌 WebSocket 연결이 종료되었습니다. 5초 후 재연결을 시도합니다.');
        statusElement.textContent = "서버와 연결이 끊겼습니다. 재연결 시도 중...";
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
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString('ko-KR');
    li.textContent = `[${time}] ${message}`;
    warningList.prepend(li);
}

function updateSessionTimer() {
    if (!sessionStartTime || isPaused) return;
    const now = new Date();
    const elapsed = new Date(now - sessionStartTime);
    const hours = String(elapsed.getUTCHours()).padStart(2, '0');
    const minutes = String(elapsed.getUTCMinutes()).padStart(2, '0');
    const seconds = String(elapsed.getUTCSeconds()).padStart(2, '0');
    sessionTimerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}

/**
 * 모든 기능을 시작하는 메인 진입점 함수
 */
function startApp() {
    console.log("🟢 애플리케이션 시작.");
    
    // 초기화 함수들을 병렬로 실행
    setTimeout(connectWebSocket, 0);
    setTimeout(initializeWebcam, 0);
    setTimeout(initializeMediaPipe, 0);

    // 세션 시작 시간 기록 및 타이머 시작
    sessionStartTime = new Date();
    sessionTimerInterval = setInterval(updateSessionTimer, 1000);

    // 버튼 이벤트 리스너 등록
    pauseResumeButton.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseResumeButton.textContent = isPaused ? '재개' : '일시정지';
        statusElement.textContent = isPaused ? "⏸️ 일시정지됨" : "분석이 재개되었습니다.";
        const eventType = isPaused ? 'paused' : 'resumed';
        sendEvent('status_update', { status: eventType });
    });

    endSessionButton.addEventListener('click', () => {
        if (confirm("정말로 세션을 종료하시겠습니까?")) {
            sendEvent('end', { reason: 'user_clicked_end_button' });
            statusElement.textContent = "세션을 종료합니다...";
            clearInterval(sessionTimerInterval); // 타이머 중지
            setTimeout(() => { window.location.href = "/"; }, 500);
        }
    });

    toggleWarningListButton.addEventListener('click', () => {
        const container = document.getElementById('warning-list-container');
        if (container.style.display === 'none') {
            container.style.display = 'block';
            toggleWarningListButton.textContent = '경고 목록 숨기기';
        } else {
            container.style.display = 'none';
            toggleWarningListButton.textContent = '경고 목록 보기';
        }
    });
}

// --- 애플리케이션 실행 ---

document.addEventListener("DOMContentLoaded", startApp);

window.addEventListener('beforeunload', (event) => {
    sendEvent('end', { reason: 'user_closed_tab' });
});
