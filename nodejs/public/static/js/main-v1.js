// HTML 요소 가져오기
const videoElement = document.getElementById("webcam-video");
const canvasElement = document.getElementById("landmark-canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusElement = document.getElementById("status");

// MediaPipe 및 비디오 상태 플래그
let isFaceMeshInitialized = false;
let isVideoPlaying = false;
let lastDetectionTime = 0;
const detectionInterval = 1000; // 1초마다 특징 추출

// ✨ 1. WebSocket 관련 변수 추가
const WEBSOCKET_URL = `wss://${window.location.hostname}/ws`; // 443 포트를 사용하는 웹소켓 보안 프로토콜.
let websocket;

// 고유 세션 ID 생성
const SESSION_ID = crypto.randomUUID();
console.log(`🔵 새로운 세션이 시작되었습니다. Session ID: ${SESSION_ID}`);

// 특징 추출 헬퍼 함수 (기존과 동일)
function getDistance(p1, p2) { return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2); }
function getEAR(eyeLandmarks) { /* ... 기존 코드 ... */ return (getDistance(eyeLandmarks[1], eyeLandmarks[5]) + getDistance(eyeLandmarks[2], eyeLandmarks[4])) / (2.0 * getDistance(eyeLandmarks[0], eyeLandmarks[3])); }

// MediaPipe FaceMesh 설정 (기존과 동일)
const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.3, minTrackingConfidence: 0.5, modelComplexity: 0 });
faceMesh.onResults(onResults);

// 웹캠 초기화 함수 (기존과 동일)
async function initializeWebcamAndMediaPipeProcessing() { /* ... 기존 코드 ... */ }

// MediaPipe에 프레임 전송 루프 (기존과 동일)
async function sendFramesToMediaPipe() { /* ... 기존 코드 ... */ }

// ✨ 2. MediaPipe 결과 처리 함수 수정
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const faceLandmarks = results.multiFaceLandmarks[0];
        const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
        const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
        
        const leftEye = LEFT_EYE_INDICES.map(i => faceLandmarks[i]);
        const rightEye = RIGHT_EYE_INDICES.map(i => faceLandmarks[i]);
        const earLeft = parseFloat(getEAR(leftEye).toFixed(3));
        const earRight = parseFloat(getEAR(rightEye).toFixed(3));

        // 이제 데이터를 버퍼에 쌓지 않고, 즉시 웹소켓으로 전송합니다.
        const features = {
            sessionId: SESSION_ID,
            eventType: 'data',
            payload: {
                timestamp: new Date().toISOString(),
                ear_left: earLeft,
                ear_right: earRight
            }
        };
        
        // 웹소켓이 연결된 상태일 때만 메시지 전송
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify(features));
        }

        statusElement.textContent = `🟢 EAR Left: ${earLeft}, EAR Right: ${earRight}`;
    } else {
        statusElement.textContent = "얼굴을 찾고 있습니다...";
    }
    canvasCtx.restore();
}

// ✨ 3. WebSocket 연결 및 관리 함수
function connectWebSocket() {
    console.log(`🟡 WebSocket 서버에 연결을 시도합니다... (${WEBSOCKET_URL})`);
    statusElement.textContent = "실시간 분석 서버에 연결 중...";
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
        console.log('✅ WebSocket 연결 성공.');
        statusElement.textContent = "연결 성공! 얼굴을 보여주세요.";
    };

    // 서버로부터 메시지(알람 등) 수신
    websocket.onmessage = (event) => {
        console.log(`🔔 서버로부터 메시지 수신: ${event.data}`);
        // 여기에 나중에 알람을 화면에 표시하는 로직을 추가합니다.
        statusElement.textContent = `🚨 서버 알람: ${event.data}`;
    };

    websocket.onclose = () => {
        console.log('🔌 WebSocket 연결이 종료되었습니다. 5초 후 재연결을 시도합니다.');
        statusElement.textContent = "서버와 연결이 끊겼습니다. 재연결 시도 중...";
        setTimeout(connectWebSocket, 5000); // 5초 후 재연결 시도
    };

    websocket.onerror = (error) => {
        console.error('🔴 WebSocket 에러 발생:', error);
        statusElement.textContent = "연결 에러 발생!";
        websocket.close(); // 에러 발생 시 연결을 닫고, onclose 핸들러가 재연결을 시도하게 함
    };
}

// MediaPipe 초기화 함수 (기존과 동일)
async function initializeMediaPipe() { /* ... 기존 코드 ... */ }

// ✨ 4. 애플리케이션 시작 지점 수정
document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 DOMContentLoaded: 페이지 로드 완료.");
    
    // 페이지가 로드되면 웹소켓 연결 시작
    connectWebSocket();

    initializeWebcamAndMediaPipeProcessing();
    initializeMediaPipe();
});
