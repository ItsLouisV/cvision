from google import genai
from app.core.config import config
import numpy as np
from typing import List
import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY,
                                   http_options={'api_version': 'v1beta'}
                                   )
        self.local_model = None  # Lazy load

    # def _get_local_model(self):
    #     if self.local_model is None:
    #         logger.info("Loading local embedding model (all-MiniLM-L6-v2) as fallback...")
    #         self.local_model = SentenceTransformer('all-MiniLM-L6-v2')
    #     return self.local_model

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
            # logger.warning(f"Gemini embedding error: {e}. Falling back to local model...")
            # try:
            #     model = self._get_local_model()
            #     # Tạo vector và pad/trunate để ra độ dài 768 chiều (giống Gemini)
            #     vector = model.encode(text).tolist()
                
            #     # Model local thường ra 384 chiều, ta cần pad lên 768 chiều để khớp với db
            #     if len(vector) < 768:
            #         vector.extend([0.0] * (768 - len(vector)))
            #     elif len(vector) > 768:
            #         vector = vector[:768]
                
            #     return vector
            # except Exception as local_err:
            #     logger.error(f"Local embedding fallback also failed: {local_err}")
            #     raise local_err
            logger.error(f"Gemini embedding error: {e}")
            raise

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Tính độ tương đồng cosine giữa 2 vectors"""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))