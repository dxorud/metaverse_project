import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Test from './components/Test.jsx';
import Chatbot from './components/Chatbot.jsx';
import Interview from './components/Interview.jsx';

function App() {
  return (
    <Router>
      <Routes>
        {/* Dify API 연동 챗봇 */}
        <Route path="/" element={<Test />} />

        {/* Dify & Elevenlabs 챗봇 */}
        <Route path="/chat" element={<Chatbot />} />

        {/* AI Interview */}
        <Route path="/interview" element={<Interview />} />

      </Routes>
    </Router>
  );
}

export default App;

