from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Lỗi: Không tìm thấy GEMINI_API_KEY")
else:
    client = genai.Client(api_key=api_key)
    print(f"{'Model Name':<40}")
    print("-" * 40)

    try:
        for model in client.models.list():
            # In ra tên model trước để chắc chắn nó chạy được
            print(f"{model.name:<40}")

            # Nếu Louis muốn xem các tính năng, hãy thử in model.__dict__
            # hoặc chỉ cần tìm xem có 'text-embedding-004' không
    except Exception as e:
        print(f"❌ Lỗi: {e}")