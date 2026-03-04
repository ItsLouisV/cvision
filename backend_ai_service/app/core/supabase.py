from supabase import create_client
from app.core.config import config
import logging

logger = logging.getLogger(__name__)


class SupabaseClient:
    def __init__(self):
        self.url = config.SUPABASE_URL
        self.key = config.SUPABASE_KEY
        self.client = None

    def init(self):
        try:
            self.client = create_client(self.url, self.key)
            logger.info("✅ Supabase connected")
            return self.client
        except Exception as e:
            logger.error(f"❌ Supabase connection failed: {e}")
            raise e

    def get_client(self):
        if not self.client:
            self.init()
        return self.client


supabase = SupabaseClient()