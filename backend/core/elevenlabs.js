const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ✅ .env 경로 지정 (최상단에서 한 번만 호출되었으면 생략 가능)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;

const VOICE_IDS = {
    A: process.env.VOICE_ID_A,
    B: process.env.VOICE_ID_B,
    C: process.env.VOICE_ID_C,
    DEFAULT: process.env.VOICE_ID_DEFAULT
};

// 🟣 1. 텍스트 → 음성 (TTS)
async function textToSpeech(text, role = 'DEFAULT') {
    const voiceId = VOICE_IDS[role.toUpperCase()];
    if (!voiceId) throw new Error(`Invalid voice role: ${role}`);

    try {
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.8
                }
            },
            {
                headers: {
                    'xi-api-key': ELEVEN_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer' // 중요: binary data 처리
            }
        );

        return response.data; // audio binary buffer 반환
    } catch (error) {
        throw new Error(`TTS 실패: ${error.response?.status} - ${error.response?.data}`);
    }
}

// 🔵 2. 음성 → 텍스트 (STT)
async function speechToText(buffer, filename) {
    try {
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), filename); // 또는 `Buffer.from()` 사용 가능

        const response = await axios.post(
            'https://api.elevenlabs.io/v1/audio-to-text',
            formData,
            {
                headers: {
                    'xi-api-key': ELEVEN_API_KEY,
                    ...formData.getHeaders?.() || {} // node-fetch or axios+form-data compatibility
                }
            }
        );

        return response.data.text || '';
    } catch (error) {
        throw new Error(`[STT 실패] ${error.response?.status}: ${error.response?.data}`);
    }
}

module.exports = {
    textToSpeech,
    speechToText
};
