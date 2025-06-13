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

// 고유 세션 ID 생성
const SESSION_ID = crypto.randomUUID();
console.log(`🔵 새로운 세션이 시작되었습니다. Session ID: ${SESSION_ID}`);

// 특징 추출 헬퍼 함수
function getDistance(p1, p2) { return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2); }
function getEAR(eyeLandmarks) { return (getDistance(eyeLandmarks[1], eyeLandmarks[5]) + getDistance(eyeLandmarks[2], eyeLandmarks[4])) / (2.0 * getDistance(eyeLandmarks[0], eyeLandmarks[3])); }

// MediaPipe FaceMesh 설정
const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.3, minTrackingConfidence: 0.5, modelComplexity: 0 });
faceMesh.onResults(onResults);

// 웹캠 초기화 함수
async function initializeWebcamAndMediaPipeProcessing() {
    console.log("🟢 웹캠 초기화 시작.");
    statusElement.textContent = "웹캠 활성화 요청 중...";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            videoElement.style.display = "block";
        };
        videoElement.addEventListener("playing", () => {
            console.log("🟢 비디오 재생 시작됨.");
            isVideoPlaying = true;
            if (isFaceMeshInitialized) {
                sendFramesToMediaPipe();
            }
        }, { once: true });
    } catch (error) {
        console.error("🔴 웹캠 활성화 실패:", error);
    }
}

// MediaPipe에 프레임 전송 루프
async function sendFramesToMediaPipe() {
    if (!isFaceMeshInitialized || !isVideoPlaying || videoElement.paused || videoElement.ended) return;
    const now = performance.now();
    if (now - lastDetectionTime >= detectionInterval) {
        if (videoElement.videoWidth > 0) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            await faceMesh.send({ image: videoElement });
            lastDetectionTime = now;
        }
    }
    setTimeout(sendFramesToMediaPipe, 100);
}

// MediaPipe 결과 처리 함수
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

        const features = {
            sessionId: SESSION_ID,
            eventType: 'data',
            payload: {
                timestamp: new Date().toISOString(),
                ear_left: earLeft,
                ear_right: earRight
            }
        };
        
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify(features));
        }
        statusElement.textContent = `🟢 EAR Left: ${earLeft}, EAR Right: ${earRight}`;
    } else {
        statusElement.textContent = "얼굴을 찾고 있습니다...";
    }
    canvasCtx.restore();
}

// WebSocket 연결 및 관리 함수
function connectWebSocket() {
    console.log(`🟡 WebSocket 연결 시도.`);
    statusElement.textContent = "실시간 분석 서버에 연결 중...";
    websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = () => {
        console.log('✅ WebSocket 연결 성공.');
        statusElement.textContent = "연결 성공! 얼굴을 보여주세요.";
    };

    websocket.onmessage = (event) => {
        console.log(`🔔 서버로부터 메시지 수신: ${event.data}`);
        statusElement.textContent = `🚨 서버 알람: ${event.data}`;
    };

    websocket.onclose = () => {
        console.log('🔌 WebSocket 연결이 종료되었습니다. 5초 후 재연결을 시도합니다.');
        statusElement.textContent = "서버와 연결이 끊겼습니다. 재연결 시도 중...";
        setTimeout(connectWebSocket, 5000);
    };

    websocket.onerror = (error) => {
        console.error('🔴 WebSocket 에러 발생:', error);
        statusElement.textContent = "연결 에러 발생!";
        websocket.close();
    };
}

// MediaPipe 초기화 함수
async function initializeMediaPipe() {
    console.log("🟢 MediaPipe 초기화 시작.");
    statusElement.textContent = "AI 모델 로드 중...";
    await faceMesh.initialize();
    isFaceMeshInitialized = true;
    console.log("🟢 MediaPipe 모델 초기화 완료.");
    if (isVideoPlaying) {
        sendFramesToMediaPipe();
    }
}

// ✨ 최종 수정: 애플리케이션 시작 지점
document.addEventListener("DOMContentLoaded", () => {
    console.log("🟢 DOMContentLoaded: 페이지 로드 완료.");
    
    // 각 초기화 함수를 이벤트 루프의 다음 턴으로 넘겨서 실행 순서 꼬임을 방지합니다.
    setTimeout(connectWebSocket, 0);
    setTimeout(initializeWebcamAndMediaPipeProcessing, 0);
    setTimeout(initializeMediaPipe, 0);
});
