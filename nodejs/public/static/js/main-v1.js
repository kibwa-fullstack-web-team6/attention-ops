// HTML 요소 가져오기
const videoElement = document.getElementById("webcam-video");
const canvasElement = document.getElementById("landmark-canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusElement = document.getElementById("status");

// MediaPipe 모델 초기화 상태와 비디오 재생 상태를 추적하는 전역 플래그
let isFaceMeshInitialized = false;
let isVideoPlaying = false;
let lastDetectionTime = 0;
const detectionInterval = 1000;

// 서버 전송 관련 변수
const featuresBuffer = [];
const sendInterval = 10 * 1000;
const EVENT_API_URL = "/api/events";

// 페이지 로드 시 고유한 세션 ID 생성
const SESSION_ID = crypto.randomUUID();
console.log(`🔵 새로운 세션이 시작되었습니다. Session ID: ${SESSION_ID}`);


// 특징 추출을 위한 헬퍼 함수
function getDistance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function getEAR(eyeLandmarks) {
    const verDist1 = getDistance(eyeLandmarks[1], eyeLandmarks[5]);
    const verDist2 = getDistance(eyeLandmarks[2], eyeLandmarks[4]);
    const horDist = getDistance(eyeLandmarks[0], eyeLandmarks[3]);
    const ear = (verDist1 + verDist2) / (2.0 * horDist);
    return ear;
}

// MediaPipe FaceMesh 설정
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.3,
    minTrackingConfidence: 0.5,
    modelComplexity: 0,
});

faceMesh.onResults(onResults);

// 웹캠 스트림 초기화 함수
async function initializeWebcamAndMediaPipeProcessing() {
    console.log("🟢 웹캠 초기화 함수 진입.");
    statusElement.textContent = "웹캠 활성화 요청 중...";
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
        });
        console.log("🟢 웹캠 스트림 획득 성공.");
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            videoElement.play();
            videoElement.style.display = "block";
        };
        videoElement.addEventListener("playing", () => {
            isVideoPlaying = true;
            if (isFaceMeshInitialized) {
                sendFramesToMediaPipe();
            }
            startSendingDataToServer();
        }, { once: true });
    } catch (error) {
        console.error("🔴 웹캠 활성화 치명적인 실패:", error);
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
        const earLeft = getEAR(leftEye);
        const earRight = getEAR(rightEye);
        const features = {
            timestamp: new Date().toISOString(),
            ear_left: parseFloat(earLeft.toFixed(3)),
            ear_right: parseFloat(earRight.toFixed(3))
        };
        featuresBuffer.push(features);
        statusElement.textContent = `🟢 특징 데이터 수집 중... (${featuresBuffer.length}개)`;
    } else {
        statusElement.textContent = "얼굴을 찾고 있습니다...";
    }
    canvasCtx.restore();
}

// 세션 시작/종료 이벤트를 보내는 범용 함수
async function sendSessionEvent(eventType) {
    const eventData = {
        sessionId: SESSION_ID,
        eventType: eventType,
        timestamp: new Date().toISOString(),
    };
    console.log(`🚀 ${eventType} 이벤트 전송 시도...`);
    try {
        await fetch(EVENT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(eventData),
            keepalive: true,
        });
    } catch (error) {
        console.error(`🔴 ${eventType} 이벤트 전송 실패:`, error);
    }
}

// 주기적인 데이터 전송 함수
async function sendDataToServer() {
    if (featuresBuffer.length === 0) return;
    const dataToSend = {
        sessionId: SESSION_ID,
        eventType: 'data',
        payload: [...featuresBuffer]
    };
    featuresBuffer.length = 0;
    try {
        await fetch(EVENT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dataToSend),
        });
    } catch (error) {
        console.error("🔴 data 이벤트 전송 실패:", error);
    }
}

function startSendingDataToServer() {
    setInterval(sendDataToServer, sendInterval);
}

// MediaPipe 초기화 함수
async function initializeMediaPipe() {
    statusElement.textContent = "MediaPipe 모델 로드 중...";
    await faceMesh.initialize();
    isFaceMeshInitialized = true;
    console.log("🟢 MediaPipe 모델 초기화 완료.");
    if (isVideoPlaying) {
        sendFramesToMediaPipe();
    }
}

// 애플리케이션 시작 지점
document.addEventListener("DOMContentLoaded", () => {
    sendSessionEvent('start');
    initializeWebcamAndMediaPipeProcessing();
    initializeMediaPipe();
});

// 페이지를 떠날 때 세션 종료 이벤트 전송
window.addEventListener('beforeunload', () => {
    sendSessionEvent('end');
});
