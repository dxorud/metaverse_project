const axios = require('axios');
const path = require('path');
const FormData = require('form-data'); // ← 꼭 필요함

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;

const VOICE_IDS = {
    A: process.env.VOICE_ID_A,
    B: process.env.VOICE_ID_B,
    C: process.env.VOICE_ID_C,
    DEFAULT: process.env.VOICE_ID_DEFAULT
};

// 텍스트 → 음성 (TTS)
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
                responseType: 'arraybuffer'
            }
        );

        return response.data; // audio binary buffer 반환
    } catch (error) {
        console.error("TTS 오류:", error.response?.data || error.message);
        throw new Error(`TTS 실패: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
    }
}

// 음성 → 텍스트 (STT)
async function speechToText(buffer, filename) {
    try {
        const formData = new FormData();
        formData.append('file', buffer, {
            filename,
            contentType: 'audio/webm'
        });

        // ElevenLabs STT는 model_id 필수!
        formData.append('model_id', 'scribe_v1');

        const response = await axios.post(
            'https://api.elevenlabs.io/v1/speech-to-text',
            formData,
            {
                headers: {
                    'xi-api-key': ELEVEN_API_KEY,
                    ...formData.getHeaders()
                }
            }
        );

        return response.data.text || '';
    } catch (error) {
        console.error("STT 오류:", error.response?.data || error.message);
        throw new Error(`[STT 실패] ${error.response?.status}: ${JSON.stringify(error.response?.data)}`);
    }
}

module.exports = {
    textToSpeech,
    speechToText
};
