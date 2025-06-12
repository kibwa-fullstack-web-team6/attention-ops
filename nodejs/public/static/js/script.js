// HTML 요소 가져오기
const videoElement = document.getElementById("webcam-video");
const canvasElement = document.getElementById("landmark-canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusElement = document.getElementById("status");

// MediaPipe 모델 초기화 상태와 비디오 재생 상태를 추적하는 전역 플래그
let isFaceMeshInitialized = false;
let isVideoPlaying = false;
let lastDetectionTime = 0; // 마지막 감지 시간
const detectionInterval = 1000; // 1초 (1000ms) 간격으로 랜드마크 감지

// 서버 전송 관련 변수
const featuresBuffer = [];

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

// ✨ 수정 1: 함수의 가장 첫 줄에 테스트 로그 추가
async function initializeWebcamAndMediaPipeProcessing() {
    console.log("테스트 2번 - 웹캠 함수 진입"); // 테스트를 위해 로그 메시지 수정
    
    statusElement.textContent = "웹캠 활성화 요청 중...";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg = "🚨 브라우저가 웹캠 API(getUserMedia)를 지원하지 않습니다.";
        console.error(msg);
        statusElement.textContent = msg;
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
        });
        videoElement.srcObject = stream;
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play();
                videoElement.style.display = "block";
                resolve();
            };
        });
        videoElement.addEventListener("playing", () => {
            isVideoPlaying = true;
            if (isFaceMeshInitialized) {
                sendFramesToMediaPipe();
            }
        }, { once: true });
    } catch (error) {
        let customErrorMessage = `웹캠 활성화 실패: ${error.name || "UnknownError"}`;
        // ... (이하 상세 에러 메시지 부분은 기존과 동일)
        statusElement.textContent = `🚨 ${customErrorMessage}`;
        console.error("🔴 웹캠 활성화 치명적인 실패:", error);
    }
}

// MediaPipe에 프레임 전송 루프
async function sendFramesToMediaPipe() {
    if (!isFaceMeshInitialized || !isVideoPlaying) {
        setTimeout(sendFramesToMediaPipe, detectionInterval);
        return;
    }
    if (videoElement.paused || videoElement.ended) {
        return;
    }
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
            ear_left: earLeft,
            ear_right: earRight
        };
        featuresBuffer.push(features);
        console.log(`🔵 EAR Left: ${earLeft.toFixed(3)}, EAR Right: ${earRight.toFixed(3)}`);
        statusElement.textContent = `🟢 특징 데이터 수집 중... (${featuresBuffer.length}개)`;
    } else {
        statusElement.textContent = "얼굴을 찾고 있습니다... (카메라를 정면으로 바라봐 주세요)";
    }
    canvasCtx.restore();
}

// ✨ 수정 2: 맨 아래 이벤트 리스너를 테스트용으로 교체
document.addEventListener("DOMContentLoaded", () => {
    console.log("테스트 1번");
    initializeWebcamAndMediaPipeProcessing(); // async/await 없이 호출
    console.log("테스트 3번");
    
    // MediaPipe 모델 초기화는 그대로 진행
    faceMesh.initialize().then(() => {
        isFaceMeshInitialized = true;
        console.log("🟢 isFaceMeshInitialized 플래그가 TRUE로 설정됨.");
        if (isVideoPlaying) {
            sendFramesToMediaPipe();
        }
    });
});