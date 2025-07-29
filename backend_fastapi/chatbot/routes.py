from fastapi import APIRouter, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, JSONResponse
from core.elevenlabs import text_to_speech, speech_to_text
import os, requests

from io import BytesIO

router = APIRouter()

DIFY_API_KEY = os.getenv("DIFY_API_KEY")

@router.post("/stt")
async def chatbot_stt(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = speech_to_text(content, file.filename)
        return {"text": text}
    except Exception as e:
        return JSONResponse({"error": "STT 실패", "detail": str(e)}, status_code=500)

@router.post("/tts")
async def chatbot_tts(text: str = Form(...)):
    try:
        audio_stream: BytesIO = text_to_speech(text)
        return StreamingResponse(audio_stream, media_type="audio/mpeg", headers={
            "Content-Disposition": "inline; filename=speech.mp3"
        })
    except Exception as e:
        return JSONResponse({"error": "TTS 실패", "detail": str(e)}, status_code=500)

@router.post("/chat")
async def chatbot_chat(request: Request):
    try:
        data = await request.json()
        query = data.get("query")
        user_id = data.get("user", "guest")

        res = requests.post(
            "https://api.dify.ai/v1/chat-messages",
            headers={
                "Authorization": f"Bearer {DIFY_API_KEY}",
                "Content-Type": "application/json"
            },
            json={"query": query, "user": user_id, "inputs": {}}
        )
        if res.status_code == 200:
            body = res.json()
            return {"answer": body.get("answer"), "id": body.get("id")}
        else:
            return JSONResponse(status_code=res.status_code, content={"error": "Dify 실패", "detail": res.text})
    except Exception as e:
        return JSONResponse({"error": "챗봇 실패", "detail": str(e)}, status_code=500)
    