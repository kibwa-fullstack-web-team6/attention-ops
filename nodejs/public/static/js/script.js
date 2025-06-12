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

// 서버 전송 관련 변수 - 지금은 사용하지 않음
const featuresBuffer = []; // << 변경: landmarksBuffer -> featuresBuffer 로 이름 변경. 가공된 특징 데이터를 임시 저장.
// const sendInterval = 10 * 1000; // 10초 (10000ms) 간격으로 서버에 전송 (비활성화)
// const SERVER_URL = "http://localhost:3000/landmarks"; // (비활성화)

// =================================================================
// ✨ 1. 특징 추출을 위한 헬퍼 함수 추가
// =================================================================

// 두 랜드마크(점) 사이의 2D 거리를 계산하는 함수
function getDistance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// 눈 랜드마크를 기반으로 EAR(눈 종횡비)을 계산하는 함수
function getEAR(eyeLandmarks) {
    // 눈의 수직 거리 계산
    const verDist1 = getDistance(eyeLandmarks[1], eyeLandmarks[5]);
    const verDist2 = getDistance(eyeLandmarks[2], eyeLandmarks[4]);

    // 눈의 수평 거리 계산
    const horDist = getDistance(eyeLandmarks[0], eyeLandmarks[3]);

    // EAR 공식
    const ear = (verDist1 + verDist2) / (2.0 * horDist);
    return ear;
}


// MediaPipe FaceMesh 설정 (기존과 동일)
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

faceMesh.onResults(onResults); // 결과 처리 함수 연결

// 웹캠 스트림 설정 및 MediaPipe 처리 시작 (기존과 거의 동일)
async function initializeWebcamAndMediaPipeProcessing() {
    // ... (이 부분의 코드는 기존과 완전히 동일합니다) ...
    // ... (웹캠 활성화 및 에러 처리) ...
    console.log("테스트 2번 - 웹캠 함수 진입");
    // playing 이벤트 리스너에서 서버 전송 시작 함수 호출 부분만 비활성화
    videoElement.addEventListener("playing", () => {
        console.log("🟢 Video element is playing.");
        isVideoPlaying = true;
        
        if (isFaceMeshInitialized) {
            console.log("🟢 웹캠, MediaPipe 모두 준비 완료. 프레임 전송 시작.");
            sendFramesToMediaPipe(); // 첫 감지 시작
            // startSendingDataToServer(); // <<< ✨ 2. 서버 전송 로직 호출 비활성화
        } else {
            console.log("🟡 웹캠은 준비되었지만, MediaPipe가 아직 로드 대기 중...");
        }
    }, { once: true });

    // ... (이하 웹캠 관련 에러 처리 로직은 기존과 동일합니다) ...
}


// MediaPipe에 프레임 전송 루프 (기존과 동일)
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


// =================================================================
// ✨ 3. MediaPipe 결과 처리 함수 (핵심 수정 부분)
// =================================================================
function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const faceLandmarks = results.multiFaceLandmarks[0]; // 첫 번째 얼굴의 랜드마크만 사용

        // MediaPipe 랜드마크 인덱스 (Face Mesh 문서 기준)
        const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
        const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];

        // 인덱스를 사용해 실제 랜드마크 좌표 추출
        const leftEye = LEFT_EYE_INDICES.map(i => faceLandmarks[i]);
        const rightEye = RIGHT_EYE_INDICES.map(i => faceLandmarks[i]);

        // EAR 계산
        const earLeft = getEAR(leftEye);
        const earRight = getEAR(rightEye);

        // 가공된 특징 데이터를 버퍼에 추가
        const features = {
            timestamp: new Date().toISOString(),
            ear_left: earLeft,
            ear_right: earRight
        };
        featuresBuffer.push(features);

        // EAR 값 콘솔에 출력하여 확인
        console.log(`🔵 EAR Left: ${earLeft.toFixed(3)}, EAR Right: ${earRight.toFixed(3)}`);
        
        statusElement.textContent = `🟢 특징 데이터 수집 중... (${featuresBuffer.length}개)`;
        
    } else {
        console.log("🟡 얼굴을 찾고 있습니다.");
        statusElement.textContent = "얼굴을 찾고 있습니다... (카메라를 정면으로 바라봐 주세요)";
    }
    canvasCtx.restore();
}

// =================================================================
// ✨ 4. 서버 전송 관련 함수 주석 처리 (비활성화)
// =================================================================
/*
async function sendLandmarksToServer() {
    // ... (이하 서버 전송 로직 전체 비활성화) ...
}

function startSendingDataToServer() {
    console.log(`🟢 ${sendInterval / 1000}초마다 서버로 랜드마크 데이터 전송을 시작합니다.`);
    setInterval(sendLandmarksToServer, sendInterval);
}
*/


// 애플리케이션 시작 (playing 이벤트 리스너 부분 외에는 기존과 동일)
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🟢 DOMContentLoaded: 웹페이지 로드 완료. 초기화 시작.");
    console.log("테스트 1번");
    await initializeWebcamAndMediaPipeProcessing();
    console.log("테스트 3번");
    statusElement.textContent = "MediaPipe 모델 로드 중...";
    console.log("🟢 MediaPipe 모델 로드 시작: faceMesh.initialize() 호출.");
    
    await faceMesh.initialize().then(() => {
        isFaceMeshInitialized = true;
        console.log("🟢 isFaceMeshInitialized 플래그가 TRUE로 설정됨.");

        if (isVideoPlaying) {
            console.log("🟢 웹캠, MediaPipe 모두 준비 완료. 프레임 전송 시작.");
            sendFramesToMediaPipe();
            // startSendingDataToServer(); // <<< ✨ 여기도 비활성화
        }
    });
});