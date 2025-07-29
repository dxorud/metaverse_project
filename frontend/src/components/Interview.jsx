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
    const [input, setInput] = useState('');
    const [chat, setChat] = useState([]);
    const [currentInterviewer, setCurrentInterviewer] = useState(null);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const audioChunksRef = useRef([]);
    const [round, setRound] = useState(0);
    const maxRounds = 5;

    const BASE_URL = 'http://localhost:3000';

    const interviewerIds = ['B', 'A', 'C'];
    const interviewerInfo = {
        A: { name: '인사팀', image: interviewerA },
        B: { name: '기술팀', image: interviewerB },
        C: { name: '실무 팀장', image: interviewerC },
    };

    // 🔊 질문 TTS 처리
    const speakText = async (text, role) => {
        try {
            const res = await fetch(`${BASE_URL}/interview/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, role })
            });
            const blob = await res.blob();
            const audioURL = URL.createObjectURL(blob);
            new Audio(audioURL).play();
        } catch (error) {
            console.error("🔈 TTS 오류:", error);
        }
    };

    // 📌 chat이 업데이트되면 마지막 면접관 질문에 대해 TTS 자동 실행
    useEffect(() => {
        const last = chat.at(-1);
        if (last && last.sender !== 'user') {
            speakText(last.text, last.sender);
        }
    }, [chat]);

    // 👤 첫 질문 생성
    const pickFirstInterviewer = async () => {
        try {
            const res = await fetch(`${BASE_URL}/interview/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: username })
            });
            const data = await res.json();
            const selected = data.interviewer;
            const question = data.question;

            setCurrentInterviewer(selected);
            setChat(prev => [...prev, { sender: selected, text: question }]);
            setRound(1);
        } catch (error) {
            console.error("🚨 첫 질문 호출 실패:", error);
        }
    };

    // 📝 답변 전송
    const handleUserSubmit = async () => {
        if (!input.trim()) return;

        const userText = input.trim();
        setChat(prev => [...prev, { sender: 'user', text: userText }]);
        setInput('');

        try {
            const res = await fetch(`${BASE_URL}/interview/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userText,
                    role: currentInterviewer,
                    user: username
                })
            });

            const data = await res.json();
            const nextQuestion = data.reply;
            const nextInterviewer = interviewerIds[Math.floor(Math.random() * interviewerIds.length)];

            setCurrentInterviewer(nextInterviewer);
            setChat(prev => [...prev, { sender: nextInterviewer, text: nextQuestion }]);
            setRound(prev => prev + 1);

            if (round + 1 >= maxRounds) {
                setTimeout(() => setShowEndModal(true), 1000);
            }
        } catch (error) {
            console.error("❌ chat 호출 실패:", error);
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

        recorder.ondataavailable = (e) => {
            audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', blob, 'recording.webm');
            formData.append('user', username);

            const res = await fetch(`${BASE_URL}/interview/stt`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (data.text) {
                setInput(data.text);
            }
        };

        recorder.start();
    };

    const handleNameSubmit = (name) => {
        setUsername(name);
        setShowModal(false);
        setTimeout(pickFirstInterviewer, 1000);
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
                {chat.filter(msg => msg.sender !== 'user').slice(-1).map((msg, idx) => (
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
                    />
                    <button onClick={handleStartRecording}>{isRecording ? '🛑' : '🎤'}</button>
                    <button onClick={handleUserSubmit}>📤</button>
                </div>
            </div>
        </div>
    );
};

export default Interview;
