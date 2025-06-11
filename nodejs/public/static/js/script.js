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
const landmarksBuffer = []; // 랜드마크 데이터를 임시 저장할 배열
const sendInterval = 10 * 1000; // 10초 (10000ms) 간격으로 서버에 전송
const SERVER_URL = "http://localhost:3000/landmarks"; // <<< 중요: 실제 서버 URL로 변경해야 합니다.

// MediaPipe FaceMesh 설정
const faceMesh = new FaceMesh({
  locateFile: (file) => {
    console.log(`🟡 locateFile 호출: ${file}`);
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  },
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.3,
  minTrackingConfidence: 0.5,
  modelComplexity: 0,
});

faceMesh.onLoaded = () => {
  console.log(
    "🟢 MediaPipe FaceMesh 모델 로드 완료! onLoaded 콜백 실행됨 (보조)."
  );
};

faceMesh.onError = (error) => {
  console.error("🔴 MediaPipe FaceMesh 모델 오류 발생:", error);
  statusElement.textContent = `🚨 모델 오류: ${
    error.message || "알 수 없는 오류"
  }`;
};

// MediaPipe 결과 처리 함수
faceMesh.onResults(onResults);

// 웹캠 스트림 설정 및 MediaPipe 처리 시작
async function initializeWebcamAndMediaPipeProcessing() {
  console.log("🟢 initializeWebcamAndMediaPipeProcessing() 함수 진입됨.");
  statusElement.textContent = "웹캠 활성화 요청 중...";

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const msg = "🚨 브라우저가 웹캠 API(getUserMedia)를 지원하지 않습니다.";
    console.error(msg);
    statusElement.textContent = msg;
    return;
  }

  try {
    console.log("🟢 navigator.mediaDevices.getUserMedia 호출 시도...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });

    console.log("🟢 웹캠 스트림 성공적으로 획득. 비디오 요소에 할당 중...");
    videoElement.srcObject = stream;

    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        console.log("🟢 비디오 메타데이터 로드 완료. 비디오 재생 시도.");
        videoElement.play();
        videoElement.style.display = "block";
        resolve();
      };
    });

    console.log("🟢 웹캠 스트림 시작 성공. ランドマーク処理開始準備中...");
    statusElement.textContent = "🟢 웹캠 활성화 성공! 랜드마크를 감지합니다.";

    videoElement.addEventListener(
      "playing",
      () => {
        console.log("🟢 Video element is playing.");
        isVideoPlaying = true;
        console.log("🟢 isVideoPlaying 플래그가 TRUE로 설정됨.");

        if (isFaceMeshInitialized) {
          console.log("🟢 웹캠, MediaPipe 모두 준비 완료. 프레임 전송 시작.");
          sendFramesToMediaPipe(); // 첫 감지 시작
          startSendingDataToServer(); // 10초마다 서버 전송 시작
        } else {
          console.log(
            "🟡 웹캠은 준비되었지만, MediaPipe가 아직 로드 대기 중..."
          );
        }
      },
      { once: true }
    );

    videoElement.addEventListener("error", (event) => {
      const error = event.target.error;
      let errorMessage = "알 수 없는 비디오 요소 오류.";
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = "미디어 로드 중단 (사용자 취소 또는 브라우저 중단).";
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = "네트워크 오류로 미디어 다운로드 실패.";
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = "미디어 디코딩 오류 발생.";
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "미디어 소스 또는 형식 지원 안 됨.";
            break;
          default:
            errorMessage = `알 수 없는 미디어 오류 (코드: ${error.code}).`;
            break;
        }
      }
      console.error(`🔴 웹캠 비디오 요소 오류: ${errorMessage}`, error);
      statusElement.textContent = `🚨 웹캠 오류: ${errorMessage}`;
    });
  } catch (error) {
    let customErrorMessage = `웹캠 활성화 실패: ${
      error.name || "UnknownError"
    }`;
    if (error.name === "NotAllowedError")
      customErrorMessage +=
        " - 카메라 사용 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.";
    else if (error.name === "NotFoundError")
      customErrorMessage +=
        " - 사용 가능한 카메라를 찾을 수 없습니다. 카메라 연결 상태를 확인해주세요.";
    else if (error.name === "AbortError")
      customErrorMessage +=
        " - 웹캠 접근이 중단되었습니다 (다른 앱 사용 중이거나 장치 오류).";
    else if (error.name === "NotReadableError")
      customErrorMessage +=
        " - 카메라 장치를 사용할 수 없습니다. 다른 앱에서 사용 중이거나 재부팅이 필요할 수 있습니다.";
    else if (error.name === "SecurityError")
      customErrorMessage +=
        " - 보안 문제로 카메라 접근이 차단되었습니다 (HTTPS 필요 또는 특정 환경).";
    else customErrorMessage += ` - 상세: ${error.message}`;

    statusElement.textContent = `🚨 ${customErrorMessage}`;
    console.error("🔴 웹캠 활성화 치명적인 실패:", error);
  }
}

// MediaPipe에 프레임 전송 루프 (setTimeout 기반)
async function sendFramesToMediaPipe() {
  if (!isFaceMeshInitialized || !isVideoPlaying) {
    console.warn(
      "🟡 sendFramesToMediaPipe: 웹캠 또는 MediaPipe 모델이 아직 준비되지 않았습니다. 프레임 전송 대기 중."
    );
    setTimeout(sendFramesToMediaPipe, detectionInterval);
    return;
  }

  if (videoElement.paused || videoElement.ended) {
    console.warn(
      "🟡 sendFramesToMediaPipe: 비디오가 일시정지되었거나 끝났습니다. 프레임 전송 중단."
    );
    return;
  }

  const now = performance.now();
  if (now - lastDetectionTime >= detectionInterval) {
    if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      await faceMesh.send({ image: videoElement });
      lastDetectionTime = now;
    } else {
      console.warn(
        "🟡 sendFramesToMediaPipe: Video element dimensions are not valid yet. Waiting for video data from webcam."
      );
    }
  }
  setTimeout(sendFramesToMediaPipe, 100); // 다음 체크는 더 짧은 간격으로
}

// MediaPipe 결과 처리 함수 (그리기 도구 사용 안 함)
function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // 캔버스 그리기 테스트: 캔버스 왼쪽 상단에 파란색 사각형을 그려봅니다
  canvasCtx.fillStyle = "blue";
  canvasCtx.fillRect(0, 0, 50, 50);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const faceLandmarks = results.multiFaceLandmarks[0]; // 첫 번째 얼굴의 랜드마크만 사용

    // 랜드마크 데이터를 버퍼에 추가 (시간 정보 포함)
    landmarksBuffer.push({
      timestamp: new Date().toISOString(), // ISO 8601 형식의 현재 시간
      landmarks: faceLandmarks, // 랜드마크 데이터 (x, y, z)
    });

    // 콘솔 로그를 너무 자주 찍지 않도록 조건부로 변경
    if (landmarksBuffer.length % 5 === 0) {
      // 예를 들어, 5번째 데이터마다 로그
      console.log(`🔵 ${landmarksBuffer.length}개 랜드마크 데이터 수집됨.`);
      console.log(
        "🔵 최신 랜드마크 데이터 (일부):",
        landmarksBuffer[landmarksBuffer.length - 1].landmarks.slice(0, 5)
      );
    }

    statusElement.textContent = `🟢 랜드마크 데이터 수집 중... (${landmarksBuffer.length}개)`;
  } else {
    console.log("🟡 얼굴을 찾고 있습니다. (데이터 없음)");
    statusElement.textContent =
      "얼굴을 찾고 있습니다... (카메라를 정면으로 바라봐 주세요)";
  }
  canvasCtx.restore();
}

// 랜드마크 데이터를 서버로 전송하는 함수
async function sendLandmarksToServer() {
  if (landmarksBuffer.length === 0) {
    console.log("🟡 전송할 랜드마크 데이터가 없습니다.");
    statusElement.textContent = "🟡 전송할 데이터 없음.";
    return;
  }

  const dataToSend = [...landmarksBuffer]; // 현재 버퍼에 있는 모든 데이터 복사
  landmarksBuffer.length = 0; // 버퍼 비우기

  try {
    console.log(
      `🚀 서버로 ${dataToSend.length}개의 랜드마크 데이터 전송 시도...`
    );
    statusElement.textContent = `🚀 서버로 ${dataToSend.length}개 데이터 전송 중...`;

    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: dataToSend,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ 서버 응답:", result);
    statusElement.textContent = "✅ 데이터 전송 성공!";
  } catch (error) {
    console.error("🔴 랜드마크 데이터 서버 전송 실패:", error);
    statusElement.textContent = `🚨 데이터 전송 실패: ${error.message}`;
  }
}

// 10초마다 서버 전송 함수 호출 시작
function startSendingDataToServer() {
  console.log(
    `🟢 ${sendInterval / 1000}초마다 서버로 랜드마크 데이터 전송을 시작합니다.`
  );
  setInterval(sendLandmarksToServer, sendInterval);
}

// 애플리케이션 시작
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🟢 DOMContentLoaded: 웹페이지 로드 완료. 초기화 시작.");

  // 웹캠 초기화
  await initializeWebcamAndMediaPipeProcessing();

  statusElement.textContent = "MediaPipe 모델 로드 중...";
  console.log("🟢 MediaPipe 모델 로드 시작: faceMesh.initialize() 호출.");
  const startTime = performance.now();

  await faceMesh
    .initialize()
    .then(() => {
      const endTime = performance.now();
      console.log(
        `🟢 MediaPipe 모델 initialize() 완료 (소요 시간: ${(
          endTime - startTime
        ).toFixed(2)} ms)`
      );

      isFaceMeshInitialized = true;
      console.log(
        "🟢 isFaceMeshInitialized 플래그가 TRUE로 설정됨 (initialize().then() 내부)."
      );

      if (isVideoPlaying) {
        console.log(
          "🟢 웹캠, MediaPipe 모두 준비 완료. 프레임 전송 시작 (initialize().then() 내부)."
        );
        sendFramesToMediaPipe(); // 1초마다 랜드마크 감지 시작
      } else {
        console.log("🟡 initialize().then() 완료: 웹캠이 아직 로드 대기 중...");
      }
    })
    .catch((error) => {
      console.error("🔴 MediaPipe 모델 initialize() 중 오류 발생:", error);
      statusElement.textContent = `🚨 모델 초기화 오류: ${
        error.message || "알 수 없는 오류"
      }`;
    });
});
