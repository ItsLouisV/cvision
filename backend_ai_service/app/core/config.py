import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

    # Gemini AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    # Chuyển sang 3.1 Flash Lite để có 500 request/ngày
    GEMINI_MODEL = "gemini-3.1-flash-lite-preview"

    # SỬA Ở ĐÂY: Dùng đúng model embedding có trong danh sách của bạn
    EMBEDDING_MODEL = "gemini-embedding-001"

    # DeepSeek AI (Fallback)
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    DEEPSEEK_MODEL = "deepseek-chat"

    # Vector dimensions
    VECTOR_DIM = 768

    # Matching thresholds
    MIN_MATCH_SCORE = 0.7
    MAX_MATCH_COUNT = 20

    # File upload
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}


config = Config()