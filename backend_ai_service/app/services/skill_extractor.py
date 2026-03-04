from typing import List, Dict, Set, Any
import re
from app.utils.formatters import normalize_skill_name  # Đã có trong code của bạn
from app.utils.logger import log_info, log_error  # Tích hợp thêm logger để theo dõi


class SkillExtractor:
    # Danh sách skill mẫu - có thể mở rộng từ database
    COMMON_SKILLS = {
        'programming': ['python', 'javascript', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin'],
        'frontend': ['react', 'vue', 'angular', 'html', 'css', 'sass', 'tailwind', 'bootstrap'],
        'backend': ['node.js', 'django', 'flask', 'spring', 'laravel', 'express', 'fastapi'],
        'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch'],
        'devops': ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'gitlab'],
        'ai': ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'computer vision'],
        'soft_skills': ['communication', 'teamwork', 'leadership', 'problem solving', 'time management']
    }

    def extract_skills(self, text: str) -> Dict[str, List[Any]]:
        """Trích xuất và chuẩn hóa skills từ text"""
        text_lower = text.lower()

        # Sử dụng set để tránh trùng lặp kỹ năng trong quá trình tìm kiếm
        technical_skills_found = {}
        soft_skills_found = set()

        for category, skills in self.COMMON_SKILLS.items():
            for skill in skills:
                # Kiểm tra sự tồn tại của skill trong text (sử dụng regex để khớp chính xác từ)
                # Ví dụ: tránh việc "Java" bị khớp trong "JavaScript"
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    # Chuẩn hóa tên kỹ năng bằng utils đã viết
                    normalized_name = normalize_skill_name(skill)

                    if category == 'soft_skills':
                        soft_skills_found.add(normalized_name)
                    else:
                        # Lưu vào dict với key là tên để tránh trùng, sau đó mới đổi sang list
                        technical_skills_found[normalized_name] = {
                            'name': normalized_name,
                            'category': category
                        }

        result = {
            'technical': list(technical_skills_found.values()),
            'soft': list(soft_skills_found)
        }

        log_info("SkillExtractor",
                 f"Extracted {len(result['technical'])} tech skills and {len(result['soft'])} soft skills")
        return result

    def extract_years_experience(self, text: str) -> int:
        """Trích xuất số năm kinh nghiệm từ text bằng Regex"""
        patterns = [
            r'(\d+)\+?\s*(?:năm|year)s?\s*(?:kinh nghiệm|experience)',
            r'(?:kinh nghiệm|experience)\s*:?\s*(\d+)\+?\s*(?:năm|year)',
            r'(\d+)\s*years? of experience'
        ]

        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                years = int(match.group(1))
                log_info("SkillExtractor", f"Found {years} years of experience")
                return years

        return 0


# Khởi tạo instance
skill_extractor = SkillExtractor()