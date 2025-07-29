from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from interview.routes import router as ai_router
from chatbot.routes import router as chatbot_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.include_router(ai_router, prefix="/interview")
app.include_router(chatbot_router, prefix="/chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "AI Interview & Chatbot API is running"}
