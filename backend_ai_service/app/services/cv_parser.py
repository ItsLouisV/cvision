import io
import docx
from pypdf import PdfReader  # Thống nhất dùng pypdf như đã thảo luận
from typing import BinaryIO
from app.utils.pdf_handler import clean_extracted_text  # Tích hợp hàm làm sạch
from app.utils.logger import log_info, log_error  # Tích hợp logger tập trung


class CVParserService:
    async def parse_pdf(self, content: bytes) -> str:
        """Parse PDF to text và làm sạch dữ liệu"""
        try:
            pdf = PdfReader(io.BytesIO(content))
            text = ""
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"

            # Sử dụng utils để làm sạch khoảng trắng và ký tự thừa
            return clean_extracted_text(text)
        except Exception as e:
            log_error("CV_PARSER_PDF", f"Lỗi parse PDF: {str(e)}")
            raise

    async def parse_docx(self, content: bytes) -> str:
        """Parse DOCX to text và làm sạch dữ liệu"""
        try:
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join([p.text for p in doc.paragraphs])

            # Làm sạch text sau khi trích xuất
            return clean_extracted_text(text)
        except Exception as e:
            log_error("CV_PARSER_DOCX", f"Lỗi parse DOCX: {str(e)}")
            raise

    async def parse(self, content: bytes, filename: str) -> str:
        """Điều hướng parse dựa trên định dạng file"""
        ext = filename.lower().split('.')[-1]
        log_info("CV_PARSER", f"Bắt đầu parse file: {filename} (định dạng: {ext})")

        try:
            if ext == 'pdf':
                result = await self.parse_pdf(content)
            elif ext in ['docx', 'doc']:
                result = await self.parse_docx(content)
            elif ext == 'txt':
                result = clean_extracted_text(content.decode('utf-8'))
            else:
                raise ValueError(f"Định dạng không hỗ trợ: {ext}")

            log_info("CV_PARSER", f"Parse thành công. Độ dài văn bản: {len(result)} ký tự")
            return result

        except Exception as e:
            log_error("CV_PARSER_MAIN", f"Thất bại khi xử lý file {filename}: {str(e)}")
            raise


# Khởi tạo instance để sử dụng trong routes
cv_parser = CVParserService()