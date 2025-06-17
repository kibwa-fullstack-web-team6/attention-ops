// HTML 요소 가져오기
const videoElement = document.getElementById("webcam-video");
const canvasElement = document.getElementById("landmark-canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusElement = document.getElementById("status");

// MediaPipe 및 비디오 상태 플래그
let isFaceMeshInitialized = false;
let isVideoPlaying = false;
let lastDetectionTime = 0;
const detectionInterval = 1000;

// WebSocket 관련 변수
const WEBSOCKET_URL = `wss://${window.location.hostname}/ws`;
let websocket;

// 고유 세션 및 사용자 ID 생성
const SESSION_ID = crypto.randomUUID();
const USER_ID = "1"; // 임시 사용자 ID
console.log(`🔵 새로운 세션이 시작되었습니다. Session ID: ${SESSION_ID}, User ID: ${USER_ID}`);

// ✨ 1. 서버로 전송할 핵심 랜드마크 인덱스 목록 정의
const KEY_LANDMARK_INDICES = [
    // Head Pose (시선 이탈)
    1, 6, 10, 152, 234, 454,
    // Right Eye (오른쪽 눈 EAR)
    33, 160, 158, 133, 153, 144,
    // Left Eye (왼쪽 눈 EAR)
    362, 385, 387, 263, 373, 380,
    // Mouth (입 MAR)
    13, 14, 61, 81, 178, 291, 311, 402
];


// ✨ 2. 특징 추출 헬퍼 함수들은 더 이상 클라이언트에서 필요 없으므로 삭제합니다.
// function getDistance(...) 삭제
// function getEAR(...) 삭제


// MediaPipe FaceMesh 설정
const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.3, minTrackingConfidence: 0.5, modelComplexity: 0 });
faceMesh.onResults(onResults);


// ✨ 3. MediaPipe 결과 처리 함수를 수정하여 원시 랜드마크 좌표를 보냅니다.
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const allLandmarks = results.multiFaceLandmarks[0];

        // 478개의 랜드마크 중에서, 우리가 정의한 핵심 랜드마크만 필터링합니다.
        const keyLandmarks = allLandmarks.map((landmark, index) => ({...landmark, index}))
                                         .filter(landmark => KEY_LANDMARK_INDICES.includes(landmark.index));

        // 소수점 4자리까지만 정제하여 데이터 크기를 최적화합니다.
        const refinedLandmarks = keyLandmarks.map(lm => ({
            index: lm.index,
            x: parseFloat(lm.x.toFixed(4)),
            y: parseFloat(lm.y.toFixed(4)),
            z: parseFloat(lm.z.toFixed(4)),
        }));

        // 'data' 이벤트의 payload에 정제된 랜드마크 배열을 담아 전송합니다.
        sendEvent('data', {
            landmarks: refinedLandmarks
        });
        statusElement.textContent = `🟢 ${refinedLandmarks.length}개의 핵심 랜드마크 데이터 전송 중...`;

    } else {
        // 얼굴이 인식되지 않았을 때: 'status_update' 이벤트 전송
        sendEvent('status_update', {
            status: 'no_face_detected'
        });
        statusElement.textContent = "얼굴을 찾고 있습니다...";
    }
    canvasCtx.restore();
}

// 모든 이벤트를 보내는 범용 함수 (기존과 동일)
function sendEvent(eventType, payload) {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) { return; }
    const message = {
        sessionId: SESSION_ID,
        userId: USER_ID,
        timestamp: new Date().toISOString(),
        eventType: eventType,
        payload: payload
    };
    websocket.send(JSON.stringify(message));
}

// WebSocket 연결 및 관리 함수 (기존과 동일)
function connectWebSocket() {
    console.log(`🟡 WebSocket 연결 시도.`);
    websocket = new WebSocket(WEBSOCKET_URL);
    websocket.onopen = () => {
        console.log('✅ WebSocket 연결 성공.');
        statusElement.textContent = "연결 성공! 얼굴을 보여주세요.";
        sendEvent('start', { userAgent: navigator.userAgent });
    };
    websocket.onmessage = (event) => {
        console.log(`🔔 서버로부터 메시지 수신: ${event.data}`);
        statusElement.textContent = `🚨 서버 알람: ${event.data}`;
    };
    websocket.onclose = () => {
        console.log('🔌 WebSocket 연결이 종료되었습니다. 5초 후 재연결을 시도합니다.');
        setTimeout(connectWebSocket, 5000);
    };
    websocket.onerror = (error) => {
        console.error('🔴 WebSocket 에러 발생:', error);
        websocket.close();
    };
}


// --- 나머지 초기화 함수들은 변경 없습니다 ---
async function initializeWebcamAndMediaPipeProcessing() { /* ... */ }
async function sendFramesToMediaPipe() { /* ... */ }
async function initializeMediaPipe() { /* ... */ }
document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 DOMContentLoaded: 페이지 로드 완료.");
    setTimeout(connectWebSocket, 0);
    setTimeout(initializeWebcamAndMediaPipeProcessing, 0);
    setTimeout(initializeMediaPipe, 0);
});
window.addEventListener('beforeunload', (event) => {
    sendEvent('end', { reason: 'user_closed_tab' });
});

