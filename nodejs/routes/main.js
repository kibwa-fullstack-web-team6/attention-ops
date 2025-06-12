const express = require('express');
const router = express.Router();
const path = require('path');
const redis = require('redis');

// Redis 클라이언트 생성 및 연결
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => console.log('🔴 Redis Client Error', err));
redisClient.on('connect', () => console.log('🟢 Redis Client Connected'));

// 즉시 실행 비동기 함수로 감싸서 top-level await 사용
(async () => {
    await redisClient.connect();
})();


// --- 페이지 라우팅 ---
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

router.get('/mainService', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'pages', 'mainService.html'));
});

router.get('/health', (req, res) => {
    res.status(200).send('OK');
});


// --- ✨ 세션 이벤트를 처리할 단일 API 엔드포인트 ---
router.post('/api/events', async (req, res) => {
    // 요청 바디에서 sessionId와 eventType을 추출
    const { sessionId, eventType, timestamp, payload } = req.body;

    // 필수 값이 없으면 에러 응답
    if (!sessionId || !eventType) {
        return res.status(400).json({ status: 'error', message: 'sessionId와 eventType은 필수입니다.' });
    }

    try {
        let channel, message;

        // 이벤트 유형에 따라 채널과 메시지를 다르게 구성
        if (eventType === 'start' || eventType === 'end') {
            // 시작/종료 이벤트는 '세션 이벤트' 채널로 발행
            channel = 'attention-session-events';
            message = JSON.stringify({ sessionId, eventType, timestamp });

        } else if (eventType === 'data') {
            // 중간 데이터는 '데이터' 채널로 발행
            channel = 'attention-data';
            message = JSON.stringify({ sessionId, payload });

        } else {
            // 정의되지 않은 이벤트 유형은 에러 처리
            return res.status(400).json({ status: 'error', message: '알 수 없는 eventType입니다.' });
        }

        // 선택된 채널로 메시지 발행
        await redisClient.publish(channel, message);
        console.log(`🔵 이벤트 '${eventType}' 발행 (Session: ${sessionId}) -> Channel: ${channel}`);
        
        // 클라이언트에 성공 응답
        res.status(200).json({ status: 'success' });

    } catch (err) {
        console.error(`🔴 Redis 발행 실패 (Channel: ${channel})`, err);
        res.status(500).json({ status: 'error', message: '서버 내부 오류' });
    }
});


module.exports = router;
