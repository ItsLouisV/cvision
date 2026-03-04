import io
import requests
from pypdf import PdfReader


def extract_text_from_pdf_url(pdf_url: str) -> str:
    """Tải file PDF từ URL và trích xuất nội dung văn bản."""
    try:
        response = requests.get(pdf_url)
        response.raise_for_status()

        with io.BytesIO(response.content) as f:
            reader = PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return ""


def clean_extracted_text(text: str) -> str:
    """Làm sạch văn bản thô: xóa khoảng trắng thừa, ký tự lạ."""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return "\n".join(lines)