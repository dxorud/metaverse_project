import React from 'react';

const Chatbot = () => {
    return (
        <div style={{
            width: '600px', height: '90px', marginLeft: '500px', marginBottom: '600px'
        }}>
            <iframe
                src="https://udify.app/chatbot/8ynzeSKhleSfiHQp"
                style={{ width: '100%', height: '100%', minHeight: '700px', border: 'none' }}
                allow="microphone"
                title="Dify Chatbot"
            />
        </div >
    );
};

export default Chatbot;
