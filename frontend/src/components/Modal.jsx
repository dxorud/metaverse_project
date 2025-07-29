import React, { useState, useRef, useEffect } from 'react';
import './Modal.css';

const Modal = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        if (name.trim()) onSubmit(name.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && name.trim()) {
            handleSubmit();
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-box">
                <h2>📝 면접을 시작합니다</h2>
                <p>이름을 입력해 주세요:</p>
                <input
                    type="text"
                    ref={inputRef}
                    value={name}
                    placeholder="이름을 입력하세요"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={handleSubmit} disabled={!name.trim()}>
                    시작하기
                </button>
            </div>
        </div>
    );
};

export default Modal;
