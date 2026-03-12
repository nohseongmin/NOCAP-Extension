from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import random

app = FastAPI(title="NOCAP Fact-Check API", description="Backend Engine for NOCAP Extension")

# Allow Chrome Extension to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to chrome-extension://[id]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    textContext: str
    videoFrameBase64: str | None = None
    channelId: str | None = None

class AnalysisResponse(BaseModel):
    factScore: int
    visualScore: int
    sourceScore: int

@app.get("/")
async def root():
    return {"status": "ok", "message": "NOCAP Backend API is running."}

@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze_content(request: AnalysisRequest):
    """
    Simulates the cloud analysis pipeline:
    1. RAG-based Fact Checking (Google Fact Check Explorer / LLM)
    2. Deepfake detection (Reality Defender API)
    3. Source Credibility lookup (Supabase)
    """
    print(f"Received text chunk: {request.textContext[:50]}...")
    
    # Simulate processing time
    await asyncio.sleep(1.5)
    
    # Mock Scoring Logic
    # In reality, this would split out to multiple micro-services/API calls
    pseudo_random = len(request.textContext) % 100
    is_deepfake = random.random() < 0.2
    
    visual_score = random.randint(5, 25) if is_deepfake else random.randint(90, 100)
    fact_score = min(100, 40 + (pseudo_random // 2))
    
    return AnalysisResponse(
        factScore=fact_score,
        visualScore=visual_score,
        sourceScore=75 # Muted default for now
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
