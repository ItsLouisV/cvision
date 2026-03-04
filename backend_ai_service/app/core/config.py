import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

    # Gemini AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = "gemini-1.5-pro"  # Dùng model mạnh nhất
    EMBEDDING_MODEL = "models/embedding-001"

    # Vector dimensions (Gemini embedding)
    VECTOR_DIM = 768

    # Matching thresholds
    MIN_MATCH_SCORE = 0.7  # 70% similarity
    MAX_MATCH_COUNT = 20

    # File upload
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}


config = Config()