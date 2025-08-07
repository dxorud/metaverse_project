import React from 'react';
import './EndModal.css';

const EndModal = ({ onClose }) => {
    return (
        <div className="modal-backdrop">
            <div className="modal-box">
                <h2>🎉 면접이 종료되었습니다</h2>
                <p>수고하셨습니다! 좋은 결과가 있길 바랍니다 😊</p>
                <button onClick={onClose}>확인</button>
            </div>
        </div>
    );
};

export default EndModal;
