const express = require('express');
const router = express.Router();
const path = require('path');


router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


router.get('/mainService', (req, res) => {

    res.sendFile(path.join(__dirname, '..', 'public/pages', 'mainService.html'));
});

router.post('/landmarks', (req, res) => {
    // 클라이언트가 보낸 데이터는 req.body에 들어있습니다.
    const { data } = req.body; 

    if (!data || data.length === 0) {
        return res.status(400).json({ status: 'error', message: '데이터가 없습니다.' });
    }
    
    console.log(`✅ ${data.length}개의 특징 데이터 묶음 수신 완료!`);
    console.log('첫 번째 데이터:', data[0]);

    res.json({ status: 'success', received_count: data.length });
});


module.exports = router;