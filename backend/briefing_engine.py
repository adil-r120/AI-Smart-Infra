import os
from datetime import datetime
from bytez import Bytez

def generate_live_briefing(stats: dict, health: dict, offline_narrative: str) -> dict:
    """
    Hybrid AI Briefing Engine.
    Attempts to generate a live generative report using Bytez/Gemini.
    Falls back to the expert-system narrative if offline or error occurs.
    """
    ai_provider = os.getenv("AI_PROVIDER", "OFFLINE").upper()
    api_key = os.getenv("AI_API_KEY")
    
    briefing_text = offline_narrative
    is_live_ai = False
    
    # Only attempt Live AI if BYTEZ provider is explicitly configured with a key
    if ai_provider == "BYTEZ" and api_key and api_key != "your-key-here":
        try:
            sdk = Bytez(api_key)
            model = sdk.model("google/gemini-2.5-flash")
            
            prompt = (
                f"You are a Senior Urban Resilience Advisor briefing the Mayor. "
                f"Context: {offline_narrative}. "
                f"Stats: {stats}. Health: {health}. "
                f"Write a professional, authoritative, but accessible 4-line situational report. "
                f"End with one bold recommendation."
            )
            
            results = model.run([{"role": "user", "content": prompt}])
            
            if not results.error and results.output:
                # Handle both raw strings and Bytez message objects
                if isinstance(results.output, dict) and "content" in results.output:
                    briefing_text = results.output["content"]
                else:
                    briefing_text = str(results.output)
                is_live_ai = True
            else:
                print(f"[AI ENGINE] Bytez Error: {results.error}")
        except Exception as e:
            print(f"[AI ENGINE] Hybrid Generation Failed: {e}")

    return {
        "text": briefing_text,
        "is_live": is_live_ai
    }
