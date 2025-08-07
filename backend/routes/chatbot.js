const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { textToSpeech, speechToText } = require('../core/elevenlabs');
const path = require('path');
const FormData = require('form-data');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const router = express.Router();
const upload = multer();

const DIFY_API_KEY = process.env.DIFY_API_KEY;

// POST /stt - 음성 → 텍스트
router.post('/stt', upload.single('file'), async (req, res) => {
    try {
        const buffer = req.file.buffer;
        const filename = req.file.originalname;

        const text = await speechToText(buffer, filename);
        res.json({ text });
    } catch (err) {
        res.status(500).json({ error: 'STT 실패', detail: err.message });
    }
});

// POST /tts - 텍스트 → 음성
router.post('/tts', upload.none(), async (req, res) => {
    try {
        const text = req.body.text;
        const audioBuffer = await textToSpeech(text);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'inline; filename="speech.mp3"'
        });

        res.send(audioBuffer);
    } catch (err) {
        res.status(500).json({ error: 'TTS 실패', detail: err.message });
    }
});

// POST /chat - Dify API 호출
router.post('/chat', async (req, res) => {
    try {
        const { query, user = 'guest' } = req.body;

        const response = await axios.post(
            'http://13.125.60.100/v1/chat-messages',
            {
                query,
                user,
                inputs: {}
            },
            {
                headers: {
                    Authorization: `Bearer ${DIFY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status === 200) {
            const body = response.data;
            res.json({
                answer: body.answer,
                id: body.id
            });
        } else {
            res.status(response.status).json({
                error: 'Dify 실패',
                detail: response.data
            });
        }
    } catch (err) {
        res.status(500).json({ error: '챗봇 실패', detail: err.message });
    }
});

module.exports = router;
