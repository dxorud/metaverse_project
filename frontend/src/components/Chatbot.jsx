import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import botIcon from '../assets/botIcon.png';
import userIcon from '../assets/userIcon.png';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [recording, setRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentlyPlayingText, setCurrentlyPlayingText] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const chatEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        setMessages([
            {
                role: 'bot',
                text: '궁금한 게 있으면 뭐든지 물어보세요!😊',
            }
        ]);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const chatRes = await fetch('http://localhost:3000/chatbot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: 'demo-user', query: userMessage.text })
            });

            const chatData = await chatRes.json();
            const botMessage = { role: 'bot', text: chatData.answer };
            setMessages((prev) => [...prev, botMessage]);
        } catch (err) {
            alert("❌ Dify API 오류: " + err.message);
        }

        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleRecording = async () => {
        if (recording) {
            mediaRecorderRef.current?.stop();
            setRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('file', audioBlob, 'voice.webm');

                try {
                    const res = await fetch('http://localhost:3000/chatbot/stt', {
                        method: 'POST',
                        body: formData,
                    });

                    const data = await res.json();
                    setInput(prev => prev + (data.text || ''));
                } catch (err) {
                    alert('❌ 음성 인식 실패: ' + err.message);
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setRecording(true);
        } catch (err) {
            alert('🎤 마이크 접근 실패: ' + err.message);
        }
    };

    const playAudio = async (text) => {
        if (audioRef.current && currentlyPlayingText === text) {
            if (!audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
            return;
        }

        try {
            const button = document.activeElement;
            button.classList.add('clicked');
            setTimeout(() => button.classList.remove('clicked'), 300);

            const formData = new FormData();
            formData.append("text", text);

            const res = await fetch('http://localhost:3000/chatbot/tts', {
                method: 'POST',
                body: formData,
            });

            const blob = await res.blob();
            const audioURL = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.pause();
            }

            const audio = new Audio(audioURL);
            audioRef.current = audio;
            setCurrentlyPlayingText(text);
            setIsPlaying(true);

            audio.play();
            audio.onended = () => {
                setCurrentlyPlayingText('');
                setIsPlaying(false);
            };
        } catch (err) {
            alert("❌ 음성 출력 실패: " + err.message);
        }
    };

    return (
        <div className="chatbot-wrapper">
            <div className="chatbot-container">
                <div className="chatbot-header">💬 JOBVERSE 챗봇</div>
                <div className="chatbot-messages">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`chat-message ${msg.role}`}>
                            {msg.role === 'bot' && (
                                <>
                                    <img className="chat-icon" src={botIcon} alt="bot" />
                                    <div className="bot-bubble-wrapper">
                                        <div className="chat-bubble bot-bubble">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...props }) => <p style={{ margin: '0.3rem 0' }} {...props} />,
                                                    li: ({ node, ...props }) => <li style={{ marginLeft: '1.2rem' }} {...props} />,
                                                    ul: ({ node, ...props }) => <ul style={{ paddingLeft: '1.5rem' }} {...props} />,
                                                    ol: ({ node, ...props }) => <ol style={{ paddingLeft: '1.5rem' }} {...props} />,
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                        <button
                                            className="speaker-btn-next"
                                            onClick={() => playAudio(msg.text)}
                                            title="음성으로 듣기"
                                        >
                                            {currentlyPlayingText === msg.text && isPlaying ? '⏸' : '🔈'}
                                        </button>
                                    </div>
                                </>
                            )}
                            {msg.role === 'user' && (
                                <>
                                    <div className="chat-bubble user-bubble">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ node, ...props }) => <p style={{ margin: '0.3rem 0' }} {...props} />,
                                                li: ({ node, ...props }) => <li style={{ marginLeft: '1.2rem' }} {...props} />,
                                                ul: ({ node, ...props }) => <ul style={{ paddingLeft: '1.5rem' }} {...props} />,
                                                ol: ({ node, ...props }) => <ol style={{ paddingLeft: '1.5rem' }} {...props} />,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                    <img className="chat-icon" src={userIcon} alt="user" />
                                </>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div className="chat-message bot">
                            <img className="chat-icon" src={botIcon} alt="bot" />
                            <div className="chat-bubble bot-bubble">답변 생성 중...</div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="chatbot-input">
                    <textarea
                        className="chat-input"
                        placeholder="메시지를 입력하세요…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        className={`mic-btn ${recording ? 'recording' : ''}`}
                        onClick={toggleRecording}
                        title="음성 입력"
                    >🎤</button>
                    <button className="send-btn" onClick={handleSend}>전송</button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;