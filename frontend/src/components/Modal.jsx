import React, { useState, useRef, useEffect } from 'react';
import './Modal.css';

const Modal = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [job, setJob] = useState('');
    const [showWarning, setShowWarning] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const isValid = name.trim() !== '' && job.trim() !== '';

    const handleSubmit = () => {
        if (isValid) {
            setShowWarning(false);
            onSubmit(name.trim(), job.trim());
        } else {
            setShowWarning(true);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-box">
                <h2>📝 면접을 시작합니다</h2>

                <label htmlFor="name-input">이름을 입력해 주세요:</label>
                <input
                    id="name-input"
                    type="text"
                    ref={inputRef}
                    value={name}
                    placeholder="이름을 입력하세요"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <label htmlFor="job-input">체험해보고 싶은 직무를 입력해 주세요:</label>
                <input
                    id="job-input"
                    type="text"
                    value={job}
                    placeholder="예: 마케팅 매니저, 백엔드 개발자"
                    onChange={(e) => setJob(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                {showWarning && !isValid && (
                    <p className="modal-warning">⚠️ 이름과 직무를 모두 입력해 주세요.</p>
                )}

                <button onClick={handleSubmit} disabled={!isValid}>
                    시작하기
                </button>
            </div>
        </div>
    );
};

export default Modal;
