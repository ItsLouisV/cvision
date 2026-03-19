from google import genai
from app.core.config import config
import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY,
                                   http_options={'api_version': 'v1beta'}
                                   )

    async def generate_embedding(self, text: str) -> List[float]:
        """Tạo embedding vector từ Gemini, fallback dùng model Local (miễn phí)"""
        try:
            logger.info("Content embedding requested with Gemini...")
            result = self.client.models.embed_content(
                model=config.EMBEDDING_MODEL,
                contents=text,
                config={
                    'task_type': 'retrieval_document',
                    'output_dimensionality': 768
                }
            )
            return result.embeddings[0].values
        except Exception as e:
            logger.error(f"Gemini embedding error: {e}")
            raise

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Tính độ tương đồng cosine giữa 2 vectors"""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))