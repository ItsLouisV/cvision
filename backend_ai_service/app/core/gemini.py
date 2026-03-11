from google import genai
from openai import AsyncOpenAI
from app.core.config import config
from app.core.embeddings import EmbeddingService
import logging
import json
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        # Setup Gemini
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        
        # Setup DeepSeek (Fallback) via OpenAI compatible endpoint
        self.deepseek_client = None
        if config.DEEPSEEK_API_KEY:
            self.deepseek_client = AsyncOpenAI(
                api_key=config.DEEPSEEK_API_KEY,
                base_url="https://api.deepseek.com"
            )
        self.embedding_service = EmbeddingService()

    async def generate_text(self, prompt: str) -> str:
        """Generate text từ Gemini, fallback sang DeepSeek nếu lỗi"""
        try:
            # 1. Thử gọi Gemini trước
            logger.info("Attempting to generate content with Gemini...")
            response = self.client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=prompt
            )
            return response.text
        except Exception as e:
            logger.warning(f"Gemini generation error: {e}. Falling back to DeepSeek...")
            
            # 2. Nếu Gemini lỗi, gọi DeepSeek
            if not self.deepseek_client:
                logger.error("DeepSeek API Key is missing. Cannot fallback.")
                raise e
                
            try:
                response = await self.deepseek_client.chat.completions.create(
                    model=config.DEEPSEEK_MODEL,
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant that answers the query as directly as possible without extra formatting unless requested."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=4000
                )
                return response.choices[0].message.content
            except Exception as ds_err:
                logger.error(f"DeepSeek fallback also failed: {ds_err}")
                raise ds_err

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