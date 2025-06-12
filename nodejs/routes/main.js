const express = require('express');
const router = express.Router();
const path = require('path');
const redis = require('redis');

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Health check 
router.get('/health', (req, res) => {

    res.status(200).send('OK');
    console.log('Health check 완료!');

});



router.get('/mainService', (req, res) => {

    res.sendFile(path.join(__dirname, '..', 'public/pages', 'mainService.html'));
});

// 데이터를 받아 Redis에 발행
router.post('/api/collect', async (req, res) => {
    const { data } = req.body; 

    if (!data || data.length === 0) {
        return res.status(400).json({ status: 'error', message: '데이터가 없습니다.' });
    }

    try {
        const channel = 'attention-data';
        const message = JSON.stringify(data);

        await redisClient.publish(channel, message);
        console.log(`🔵 Published ${data.length} records to Redis channel: ${channel}`);

        res.status(200).json({ status: 'success', received_count: data.length });

    } catch (err) {
        console.error('🔴 Failed to publish to Redis', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});





module.exports = router;