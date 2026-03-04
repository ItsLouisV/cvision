import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("SmartJobAI")

def log_error(module: str, message: str):
    logger.error(f"[{module}] Error: {message}")

def log_info(module: str, message: str):
    logger.info(f"[{module}]: {message}")