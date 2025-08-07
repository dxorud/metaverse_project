const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const sessionStore = require('../session/memoryStore');
const { getEmbedding, cosineSimilarity } = require('../utils/embedding');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DIFY_AGENT_KEYS = {
    A: process.env.DIFY_AGENT_A_API_KEY,
    B: process.env.DIFY_AGENT_B_API_KEY,
    C: process.env.DIFY_AGENT_C_API_KEY
};

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_IDS = {
    A: process.env.VOICE_ID_A,
    B: process.env.VOICE_ID_B,
    C: process.env.VOICE_ID_C
};

const BASE_URL = process.env.DIFY_API_URL || 'http://13.125.60.100/v1';
const interviewerIds = ['A', 'B', 'C'];
const MAX_ROUNDS = 8;

// -------------------- Embedding Utils --------------------
const isDuplicateQuestion = async (user, newQuestion) => {
    const newEmbedding = await getEmbedding(newQuestion);
    const existing = sessionStore[user]?.questions || [];
    return existing.some(q => cosineSimilarity(q.embedding, newEmbedding) > 0.85);
};

const isSimilarAnswer = async (user, newAnswer) => {
    const newEmbedding = await getEmbedding(newAnswer);
    const existing = sessionStore[user]?.answers || [];
    return existing.some(a => cosineSimilarity(a.embedding, newEmbedding) > 0.88);
};

const saveQuestion = async (user, questionText) => {
    const embedding = await getEmbedding(questionText);
    if (!sessionStore[user]) sessionStore[user] = { round: 1, questions: [], answers: [], job: '', profile: '' };
    sessionStore[user].questions.push({ text: questionText, embedding });
};

const saveAnswer = async (user, answerText) => {
    const embedding = await getEmbedding(answerText);
    if (!sessionStore[user]) sessionStore[user] = { round: 1, questions: [], answers: [], job: '', profile: '' };
    sessionStore[user].answers.push({ text: answerText, embedding });
};

// -------------------- Reaction per Interviewer --------------------
const getReactionMessage = (interviewerId) => {
    const reactions = {
        A: [
            "기술적인 접근이 인상적입니다. 관련 경험을 더 말씀해 주시겠어요?",
            "해당 기술을 선택한 이유가 궁금합니다.",
            "비슷한 프로젝트가 있다면 알려주세요."
        ],
        B: [
            "좋은 경험이네요. 이 경험이 조직에 어떤 영향을 미쳤을까요?",
            "그 상황에서 어떤 커뮤니케이션 전략을 쓰셨나요?",
            "팀워크 측면에서 더 구체적으로 설명해 주실 수 있나요?"
        ],
        C: [
            "전체적인 판단이 좋았네요. 팀원과의 협업은 어땠나요?",
            "실행 결과는 어땠나요? 숫자나 지표로 설명해보세요.",
            "좀 더 리더십 관점에서 말씀해 주실 수 있나요?"
        ]
    };
    const list = reactions[interviewerId] || reactions.A;
    return list[Math.floor(Math.random() * list.length)];
};

// -------------------- [1] 면접 시작 --------------------
router.post('/start', async (req, res) => {
    const name = req.body.name?.trim() || "지원자";
    const job = req.body.job?.trim() || "직무 미지정";
    const selected = interviewerIds[Math.floor(Math.random() * interviewerIds.length)];
    const cleanName = name.length > 10 ? "지원자" : name.replace(/[^가-힣a-zA-Z0-9]/g, '');
    const firstQuestion = `${cleanName}님, 자기소개 부탁드립니다.`;

    sessionStore[name] = { round: 1, questions: [], answers: [], job, profile: '' };
    await saveQuestion(name, firstQuestion);

    res.setHeader('interviewer', selected);
    res.setHeader('Access-Control-Expose-Headers', 'interviewer');
    res.json({ interviewer: selected, question: firstQuestion, isFirst: true });
});

// -------------------- [2] 후속 질문 --------------------
const handleStreaming = async ({ name, job, message, profileSummary, res }) => {
    const userSession = sessionStore[name];
    const round = userSession?.round || 1;

    if (round >= MAX_ROUNDS) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ answer: "면접이 종료되었습니다. 참여해주셔서 감사합니다." })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
    }

    const selected = interviewerIds[Math.floor(Math.random() * interviewerIds.length)];
    const apiKey = DIFY_AGENT_KEYS[selected];
    if (!apiKey) {
        return res.status(400).json({ error: '면접관 API 키 누락' });
    }

    const inputs = {
        name,
        job,
        ...(profileSummary && { profile_summary: profileSummary }),
        recent_answer: message
    };

    let reaction = '';
    if (await isSimilarAnswer(name, message)) {
        reaction = getReactionMessage(selected);
    }

    try {
        const response = await axios({
            method: 'POST',
            url: `${BASE_URL}/chat-messages`,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            data: {
                inputs,
                query: `이전 답변: ${message}\n${reaction ? `[면접관 리액션] ${reaction}\n` : ''}다음 질문을 생성해주세요.`,
                response_mode: 'streaming',
                user: name
            },
            responseType: 'stream'
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('interviewer', selected);
        res.setHeader('Access-Control-Expose-Headers', 'interviewer');

        let fullQuestion = '';
        if (reaction) {
            res.write(`data: ${JSON.stringify({ answer: reaction })}\n\n`);
        }

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.startsWith('data:'));
            for (const line of lines) {
                const jsonPart = line.replace(/^data:\s*/, '');
                try {
                    const parsed = JSON.parse(jsonPart);
                    if (parsed.answer) fullQuestion += parsed.answer;
                } catch { }
                res.write(`data: ${jsonPart}\n\n`);
            }
        });

        response.data.on('end', async () => {
            if (await isDuplicateQuestion(name, fullQuestion)) {
                console.warn('⚠️ 중복 질문:', fullQuestion);
            } else {
                await saveQuestion(name, fullQuestion);
            }

            sessionStore[name].round += 1;
            res.write('data: [DONE]\n\n');
            res.end();
        });

        response.data.on('error', (err) => {
            console.error('❌ 스트림 오류:', err);
            res.end();
        });

    } catch (error) {
        console.error("❌ Dify API 오류:", error.message);
        res.status(500).json({ error: 'Dify API 호출 실패', detail: error.message });
    }
};

router.post('/chat', async (req, res) => {
    const { message, user, job, profile_summary } = req.body;
    if (!message?.trim() || !user?.trim()) {
        return res.status(422).json({ error: "message, user는 필수입니다." });
    }
    await saveAnswer(user, message);
    await handleStreaming({ name: user, job, message, profileSummary: profile_summary, res });
});

// -------------------- [3] 텍스트 → 음성 --------------------
router.post('/tts', async (req, res) => {
    const { text, role } = req.body;
    try {
        const voiceId = VOICE_IDS[role];
        if (!voiceId || !ELEVEN_API_KEY) throw new Error('voiceId 또는 API KEY 누락');
        const response = await axios({
            method: 'POST',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            headers: {
                'xi-api-key': ELEVEN_API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            data: {
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            }
        });
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(response.data));
    } catch (error) {
        res.status(500).json({ error: 'TTS 오류', detail: error.message });
    }
});

// -------------------- [4] 음성 → 텍스트 --------------------
const upload = multer();
router.post('/stt', upload.single('file'), async (req, res) => {
    try {
        const { originalname, buffer } = req.file;
        const { speechToText } = require('../core/elevenlabs');
        const text = await speechToText(buffer, originalname);
        res.json({ text });
    } catch (error) {
        res.status(500).json({ error: 'STT 오류', detail: error.message });
    }
});

module.exports = router;
