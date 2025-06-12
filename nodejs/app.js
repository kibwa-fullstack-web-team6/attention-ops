const express = require("express");
const cors = require("cors"); 
const path = require("path"); 

const app = express();


app.set("port", process.env.PORT || 3000);

// 공통 미들웨어 설정
app.use(cors()); // CORS 미들웨어 등록: 모든 출처의 요청을 허용
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'public')));

// 라우터 설정
const main = require('./routes/main');
app.use('/', main); // '/' 경로로 오는 모든 요청은 mainRouter가 처리

app.listen(app.get('port'), () => {
    console.log(`Server is started~! Port : ${app.get('port')}`);
});