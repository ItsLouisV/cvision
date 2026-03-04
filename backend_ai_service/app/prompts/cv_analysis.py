CV_ANALYSIS_PROMPT = """
Bạn là chuyên gia phân tích CV hàng đầu với trên 10 năm kinh nghiệm. Hãy phân tích CV sau đây và trả về JSON với cấu trúc đã định.

CV TEXT:
{cv_text}

YÊU CẦU PHÂN TÍCH:

1. THÔNG TIN CÁ NHÂN:
- Họ tên, email, số điện thoại
- Vị trí hiện tại, số năm kinh nghiệm

2. KỸ NĂNG:
- Technical skills: Phân loại theo mức độ (Beginner=1, Intermediate=2, Advanced=3, Expert=4, Master=5)
- Soft skills
- Top 5 kỹ năng nổi bật nhất

3. KINH NGHIỆM:
- Tổng số năm kinh nghiệm
- Các công ty đã làm, vị trí, thời gian
- Thành tựu nổi bật (dạng số nếu có)

4. HỌC VẤN:
- Bằng cấp cao nhất
- Trường, chuyên ngành, năm tốt nghiệp

5. ĐÁNH GIÁ TỔNG QUAN:
- Điểm CV (0-100)
- 3 điểm mạnh nhất
- 3 điểm cần cải thiện
- Ngành nghề phù hợp
- Mức lương đề xuất (triệu VND)

TRẢ VỀ JSON CHUẨN:
{{
  "personal_info": {{
    "full_name": "",
    "email": "",
    "phone": "",
    "current_position": "",
    "years_experience": 0
  }},
  "skills": {{
    "technical": [
      {{"name": "", "level": 0, "category": ""}}
    ],
    "soft": [],
    "top_skills": []
  }},
  "experience": [
    {{
      "company": "",
      "position": "",
      "duration": "",
      "achievements": []
    }}
  ],
  "education": {{
    "highest_degree": "",
    "school": "",
    "major": "",
    "graduation_year": ""
  }},
  "overall_score": 0,
  "strengths": [],
  "weaknesses": [],
  "recommendations": {{
    "suitable_roles": [],
    "suggested_salary": "",
    "improvement_tips": []
  }}
}}

CHÚ Ý: 
- Chỉ trả về JSON, không thêm text khác
- Nếu không có dữ liệu, để null hoặc []
- Level từ 1-5
"""