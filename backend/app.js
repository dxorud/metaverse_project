const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

const interviewRoutes = require('./routes/interview');
const chatbotRoutes = require('./routes/chatbot');

// ✅ .env 파일 경로 명시 (루트 폴더 기준)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS 설정
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ JSON 본문 파싱
app.use(express.json());

// ✅ 라우터 등록
app.use('/interview', interviewRoutes);
app.use('/chatbot', chatbotRoutes);

// ✅ 루트 응답
app.get('/', (req, res) => {
    res.json({ message: 'AI Interview & Chatbot API is running' });
});

// ✅ 서버 시작
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
