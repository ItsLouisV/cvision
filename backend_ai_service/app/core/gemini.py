import google.generativeai as genai
from app.core.config import config
from app.core.embeddings import EmbeddingService
import logging
import json
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        genai.configure(api_key=config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(config.GEMINI_MODEL)
        self.embedding_service = EmbeddingService()

    async def generate_text(self, prompt: str) -> str:
        """Generate text từ Gemini"""
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise

    async def generate_json(self, prompt: str) -> Dict[str, Any]:
        """Generate và parse JSON response"""
        try:
            response = await self.generate_text(prompt)
            # Clean response
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}\nResponse: {response}")
            return {"error": "Failed to parse AI response", "raw": response}

    async def generate_embedding(self, text: str) -> List[float]:
        """Tạo embedding vector cho text"""
        return await self.embedding_service.generate_embedding(text)


gemini = GeminiService()