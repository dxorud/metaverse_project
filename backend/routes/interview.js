const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 면접관 API Key 및 Agent ID
const DIFY_AGENT_KEYS = {
    A: process.env.DIFY_AGENT_A_API_KEY,
    B: process.env.DIFY_AGENT_B_API_KEY,
    C: process.env.DIFY_AGENT_C_API_KEY
};
const DIFY_AGENT_IDS = {
    A: process.env.DIFY_AGENT_A_ID,
    B: process.env.DIFY_AGENT_B_ID,
    C: process.env.DIFY_AGENT_C_ID
};

// -------------------- [1] 면접 시작 --------------------
router.post('/start', async (req, res) => {
    const name = req.body.name?.trim() || "익명";
    console.log("🚀 /start 요청:", { name });

    const interviewerIds = ['A', 'B', 'C'];
    const selected = interviewerIds[Math.floor(Math.random() * interviewerIds.length)];

    const apiKey = DIFY_AGENT_KEYS[selected];
    const agentId = DIFY_AGENT_IDS[selected];

    if (!apiKey || !agentId) {
        return res.status(400).json({ error: '면접관 API 키 또는 Agent ID를 찾을 수 없습니다.' });
    }

    const url = `https://api.dify.ai/v1/agents/${agentId}/chat-messages`;

    try {
        const response = await axios.post(url, {
            inputs: { name },
            query: "자기소개 부탁드립니다.",
            user: name
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const reply = response.data?.answer || "질문 생성 실패";
        console.log("✅ 첫 질문 응답:", reply);
        res.json({ interviewer: selected, question: reply });
    } catch (error) {
        console.error("❌ Dify API 오류:", error.message);
        res.status(500).json({ error: 'Dify API 호출 실패', detail: error.message });
    }
});

// -------------------- [2] 사용자 → 면접관 응답 --------------------
router.post('/chat', async (req, res) => {
    const { message, role, user } = req.body;
    console.log("💬 chat 요청:", req.body);

    if (!message?.trim() || !role?.trim()) {
        return res.status(422).json({ error: "message 또는 role이 비어 있습니다." });
    }

    const apiKey = DIFY_AGENT_KEYS[role.toUpperCase()];
    const agentId = DIFY_AGENT_IDS[role.toUpperCase()];

    if (!apiKey || !agentId) {
        return res.status(400).json({ error: "면접관 API 키 또는 Agent ID를 찾을 수 없습니다." });
    }

    const url = `https://api.dify.ai/v1/agents/${agentId}/chat-messages`;

    try {
        const response = await axios.post(url, {
            inputs: { name: user },
            query: message,
            user
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const reply = response.data?.answer || "면접관의 응답을 받아올 수 없습니다.";
        console.log("✅ 면접관 응답:", reply);
        res.json({ reply });
    } catch (error) {
        console.error("❌ chat 에러:", error.message);
        res.status(500).json({ error: 'Dify API 오류', detail: error.message });
    }
});

// -------------------- [3] 텍스트 → 음성 (TTS) --------------------
router.post('/tts', async (req, res) => {
    const { text, role } = req.body;
    console.log("🔊 TTS 요청:", req.body);

    if (!text?.trim() || !role?.trim()) {
        return res.status(422).json({ error: "text 또는 role이 비어 있습니다." });
    }

    // 👇 사용자 정의: core/elevenlabs.js에서 textToSpeech 함수 구현 필요
    const { textToSpeech } = require('../core/elevenlabs');
    try {
        const audioBuffer = await textToSpeech(text, role);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
        res.send(audioBuffer);
    } catch (error) {
        res.status(500).json({ error: 'TTS 처리 중 오류 발생', detail: error.message });
    }
});

// -------------------- [4] 음성 → 텍스트 (STT) --------------------
const upload = multer({ storage: multer.memoryStorage() });

router.post('/stt', upload.single('file'), async (req, res) => {
    try {
        const { originalname, buffer } = req.file;
        console.log("🎙️ STT 파일 업로드:", originalname);

        // 👇 사용자 정의: core/elevenlabs.js에서 speechToText 함수 구현 필요
        const { speechToText } = require('../core/elevenlabs');
        const text = await speechToText(buffer, originalname);
        res.json({ text });
    } catch (error) {
        res.status(500).json({ error: 'STT 처리 중 오류 발생', detail: error.message });
    }
});

module.exports = router;
