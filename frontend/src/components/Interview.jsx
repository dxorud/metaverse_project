import React, { useState, useEffect, useRef } from 'react';
import './Interview.css';
import Modal from './Modal';
import EndModal from './EndModal';
import interviewerA from '../assets/interviewerA.png';
import interviewerB from '../assets/interviewerB.png';
import interviewerC from '../assets/interviewerC.png';
import userProfile from '../assets/user.png';

const Interview = () => {
    const [showModal, setShowModal] = useState(true);
    const [showEndModal, setShowEndModal] = useState(false);
    const [username, setUsername] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [input, setInput] = useState('');
    const [chat, setChat] = useState([]);
    const [currentInterviewer, setCurrentInterviewer] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [round, setRound] = useState(0);
    const [firstAnswer, setFirstAnswer] = useState('');
    const maxRounds = 8;

    const BASE_URL = 'http://localhost:3000';
    const interviewerIds = ['C', 'A', 'B'];
    const prevInterviewerRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioRef = useRef(null);
    const ttsQueue = useRef([]);
    const isSpeaking = useRef(false);

    const interviewerInfo = {
        A: { name: '인사팀', image: interviewerA },
        B: { name: '기술팀', image: interviewerB },
        C: { name: '실무 팀장', image: interviewerC },
    };

    const getRandomInterviewer = () => {
        const filtered = interviewerIds.filter(id => id !== prevInterviewerRef.current);
        const selected = filtered[Math.floor(Math.random() * filtered.length)];
        prevInterviewerRef.current = selected;
        return selected;
    };

    const playNextInQueue = async () => {
        if (isSpeaking.current || ttsQueue.current.length === 0) return;
        const { text, role } = ttsQueue.current.shift();
        isSpeaking.current = true;
        try {
            const res = await fetch(`${BASE_URL}/interview/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, role })
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            if (audioRef.current) {
                audioRef.current.pause();
                URL.revokeObjectURL(audioRef.current.src);
            }

            audioRef.current = audio;
            audio.onended = () => {
                isSpeaking.current = false;
                playNextInQueue();
            };
            audio.play().catch(console.warn);
        } catch (err) {
            console.error('🔈 TTS 재생 오류:', err);
            isSpeaking.current = false;
        }
    };

    const streamChatResponse = async (url, payload, interviewerKey) => {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.body || !res.ok) throw new Error("응답 스트림 없음");

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '', fullText = '', sentenceBuffer = '';

            setChat(prev => [...prev, { sender: interviewerKey, text: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    const content = line.replace(/^data:\s*/, '').trim();
                    if (content === '[DONE]') break;

                    try {
                        const json = JSON.parse(content);
                        const delta = json.answer || '';
                        fullText += delta;
                        sentenceBuffer += delta;

                        setChat(prev => {
                            const updated = [...prev];
                            const last = updated[updated.length - 1];
                            if (last && last.sender === interviewerKey) {
                                updated[updated.length - 1] = {
                                    ...last,
                                    text: last.text + delta,
                                };
                            }
                            return updated;
                        });

                        if (/[.!?…]\s?$/.test(sentenceBuffer)) {
                            ttsQueue.current.push({ text: sentenceBuffer.trim(), role: interviewerKey });
                            sentenceBuffer = '';
                            playNextInQueue();
                        }
                    } catch (err) {
                        console.warn('⚠️ JSON 파싱 오류:', err, '\n➡️ 원본:', content);
                    }
                }
            }

            if (sentenceBuffer.trim()) {
                ttsQueue.current.push({ text: sentenceBuffer.trim(), role: interviewerKey });
                playNextInQueue();
            }

            return fullText;
        } catch (err) {
            console.error('❌ 스트리밍 실패:', err.message);
            return '죄송합니다. 응답을 가져오지 못했습니다.';
        }
    };

    const pickFirstInterviewer = async (nameParam = null) => {
        const name = nameParam || username;
        const selected = getRandomInterviewer();
        setCurrentInterviewer(selected);

        const res = await fetch(`${BASE_URL}/interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        const { question } = data;

        setChat([{ sender: selected, text: question }]);
        ttsQueue.current.push({ text: question, role: selected });
        playNextInQueue();
        setRound(1);
    };

    const handleUserSubmit = async () => {
        if (!input.trim()) return;

        const userText = input.trim();
        setChat(prev => [...prev, { sender: 'user', text: userText }]);
        setInput('');

        if (round === 1) setFirstAnswer(userText);

        if (round < maxRounds) {
            const next = getRandomInterviewer();
            setCurrentInterviewer(next);

            await streamChatResponse(`${BASE_URL}/interview/chat`, {
                message: userText,
                role: next,
                user: username,
                profile_summary: round === 1 ? userText : firstAnswer,
                job: jobRole
            }, next);

            setRound(prev => prev + 1);
        } else {
            // 마지막 답변 입력 후 종료 모달 표시
            setTimeout(() => setShowEndModal(true), 500);
        }
    };

    const handleStartRecording = async () => {
        if (isRecording && mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        audioChunksRef.current = [];
        setIsRecording(true);

        recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        recorder.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', blob, 'recording.webm');
            formData.append('user', username);

            try {
                const res = await fetch(`${BASE_URL}/interview/stt`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.text) setInput(data.text);
            } catch (err) {
                console.error('❌ STT 오류:', err);
            }
        };

        recorder.start();
    };

    const handleNameSubmit = (name, job) => {
        setUsername(name);
        setJobRole(job);
        setShowModal(false);
        setTimeout(() => pickFirstInterviewer(name), 500);
    };

    const handleInterviewEnd = () => {
        setShowEndModal(false);
        window.location.href = '/';
    };

    return (
        <div className="interview-fullscreen">
            {showModal && <Modal onSubmit={handleNameSubmit} />}
            {showEndModal && <EndModal onClose={handleInterviewEnd} />}

            <div className="interviewers">
                {interviewerIds.map((id) => (
                    <div key={id} className={`interviewer-card ${currentInterviewer === id ? 'active' : ''}`}>
                        <img src={interviewerInfo[id].image} alt={interviewerInfo[id].name} />
                        <p>{interviewerInfo[id].name}</p>
                    </div>
                ))}
            </div>

            <div className="question-display">
                {chat
                    .filter(msg => msg.sender !== 'user')
                    .slice(-1)
                    .map((msg, idx) => (
                        <div key={idx} className="question-msg">
                            <strong>{interviewerInfo[msg.sender]?.name}:</strong> {msg.text}
                        </div>
                    ))}
            </div>

            <div className="user-bottom">
                <img src={userProfile} alt="지원자" className="user-card" />
                <div className="user-input-box">
                    <input
                        type="text"
                        placeholder="답변을 입력하세요"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUserSubmit()}
                    />
                    <button onClick={handleStartRecording}>{isRecording ? '🛑' : '🎤'}</button>
                    <button onClick={handleUserSubmit}>📤</button>
                </div>
            </div>
        </div>
    );
};

export default Interview;
