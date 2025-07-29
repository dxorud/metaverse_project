import os
import requests
from io import BytesIO
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")
VOICE_IDS = {
    "A": os.getenv("VOICE_ID_A"),
    "B": os.getenv("VOICE_ID_B"),
    "C": os.getenv("VOICE_ID_C"),
    "DEFAULT": os.getenv("VOICE_ID_DEFAULT")
}

def text_to_speech(text: str, role: str = "DEFAULT") -> BytesIO:
    voice_id = VOICE_IDS.get(role.upper())
    if not voice_id:
        raise ValueError(f"Invalid voice role: {role}")

    response = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
        headers={
            "xi-api-key": ELEVEN_API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8
            }
        }
    )

    if response.status_code != 200:
        raise Exception(f"TTS 실패: {response.status_code} - {response.text}")

    return BytesIO(response.content) 

def speech_to_text(file_content: bytes, filename: str) -> str:
    response = requests.post(
        "https://api.elevenlabs.io/v1/audio-to-text",
        headers={"xi-api-key": ELEVEN_API_KEY},
        files={"file": (filename, file_content)}
    )

    if response.status_code == 200:
        return response.json().get("text", "")
    else:
        raise Exception(f"[STT 실패] {response.status_code}: {response.text}")
