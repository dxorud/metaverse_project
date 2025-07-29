from fastapi import APIRouter, UploadFile, File, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from core.elevenlabs import text_to_speech, speech_to_text
from io import BytesIO
import os
import requests
import random
from dotenv import load_dotenv
from pathlib import Path

# ✅ 루트의 .env 파일 명시적으로 로드
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

router = APIRouter()

# ✅ 면접관별 API Key 및 Agent ID 로딩
DIFY_AGENT_KEYS = {
    "A": os.getenv("DIFY_AGENT_A_API_KEY", "").strip(),
    "B": os.getenv("DIFY_AGENT_B_API_KEY", "").strip(),
    "C": os.getenv("DIFY_AGENT_C_API_KEY", "").strip()
}
DIFY_AGENT_IDS = {
    "A": os.getenv("DIFY_AGENT_A_ID", "").strip(),
    "B": os.getenv("DIFY_AGENT_B_ID", "").strip(),
    "C": os.getenv("DIFY_AGENT_C_ID", "").strip()
}

# -------------------- [1] 텍스트 → 음성 (TTS) --------------------
class TTSRequest(BaseModel):
    text: str
    role: str  # "A", "B", "C"

@router.post("/tts")
async def interview_tts(payload: TTSRequest):
    try:
        print("🔊 TTS 요청:", payload.dict())

        if not payload.text.strip() or not payload.role.strip():
            return JSONResponse({"error": "text 또는 role이 비어 있습니다."}, status_code=422)

        audio_stream: BytesIO = text_to_speech(payload.text, payload.role)
        return StreamingResponse(audio_stream, media_type="audio/mpeg", headers={
            "Content-Disposition": "inline; filename=speech.mp3"
        })
    except ValueError as ve:
        return JSONResponse({"error": str(ve)}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": "TTS 처리 중 오류 발생", "detail": str(e)}, status_code=500)

# -------------------- [2] 음성 → 텍스트 (STT) --------------------
@router.post("/stt")
async def interview_stt(file: UploadFile = File(...)):
    try:
        content = await file.read()
        print("🎙️ STT 파일 업로드:", file.filename)
        text = speech_to_text(content, file.filename)
        return {"text": text}
    except Exception as e:
        return JSONResponse({"error": "STT 처리 중 오류 발생", "detail": str(e)}, status_code=500)

# -------------------- [3] 면접 시작 --------------------
@router.post("/start")
async def interview_start(request: Request):
    try:
        body = await request.json()
        name = body.get("name", "익명") or "익명"
        print("🚀 /start 요청:", body)

        # 무작위 면접관 선택
        interviewer_ids = ["A", "B", "C"]
        selected = random.choice(interviewer_ids)

        api_key = DIFY_AGENT_KEYS.get(selected)
        agent_id = DIFY_AGENT_IDS.get(selected)
        if not api_key or not agent_id:
            return JSONResponse({"error": "면접관 API 키 또는 Agent ID를 찾을 수 없습니다."}, status_code=400)

        url = f"https://api.dify.ai/v1/agents/{agent_id}/chat-messages"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        prompt_payload = {
            "inputs": { "name": name },
            "query": "자기소개 부탁드립니다.",
            "user": name
        }

        print("📤 Dify 요청 payload:", prompt_payload)
        response = requests.post(url, headers=headers, json=prompt_payload)
        response.raise_for_status()
        data = response.json()
        reply = data.get("answer", "질문 생성 실패")

        print("✅ 첫 질문 응답:", reply)
        return {"interviewer": selected, "question": reply}
    except Exception as e:
        print("❌ Dify API 응답 오류:", str(e))
        return JSONResponse({"error": "Dify API 호출 실패", "detail": str(e)}, status_code=500)

# -------------------- [4] 사용자 → 면접관 응답 --------------------
class ChatRequest(BaseModel):
    message: str
    role: str
    user: str  # 사용자 이름

@router.post("/chat")
async def chat_with_interviewer(payload: ChatRequest):
    try:
        print("💬 chat 요청:", payload.dict())

        if not payload.message.strip() or not payload.role.strip():
            return JSONResponse({"error": "message 또는 role이 비어 있습니다."}, status_code=422)

        api_key = DIFY_AGENT_KEYS.get(payload.role.upper())
        agent_id = DIFY_AGENT_IDS.get(payload.role.upper())
        if not api_key or not agent_id:
            return JSONResponse({"error": "면접관 API 키 또는 Agent ID를 찾을 수 없습니다."}, status_code=400)

        url = f"https://api.dify.ai/v1/agents/{agent_id}/chat-messages"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        request_payload = {
            "inputs": { "name": payload.user },
            "query": payload.message,
            "user": payload.user
        }

        response = requests.post(url, headers=headers, json=request_payload)
        response.raise_for_status()
        data = response.json()
        reply = data.get("answer", "면접관의 응답을 받아올 수 없습니다.")

        print("✅ 면접관 응답:", reply)
        return {"reply": reply}
    except Exception as e:
        print("❌ chat 에러:", str(e))
        return JSONResponse({"error": "Dify API 오류", "detail": str(e)}, status_code=500)
