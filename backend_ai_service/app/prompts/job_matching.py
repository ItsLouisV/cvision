JOB_MATCHING_PROMPT = """
Bạn là AI tuyển dụng chuyên nghiệp. Phân tích độ phù hợp giữa CV và công việc sau:

CV ANALYSIS:
{cv_analysis}

JOB DETAILS:
{job_details}

TIÊU CHÍ CHẤM ĐIỂM (100%):
1. Kỹ năng chuyên môn: 40%
2. Kinh nghiệm: 30%
3. Học vấn: 15%  
4. Yếu tố khác (địa điểm, lương): 15%

YÊU CẦU:
- Tính điểm match chi tiết
- Phân tích kỹ năng đã có và còn thiếu
- Đưa ra nhận xét và gợi ý

TRẢ VỀ JSON:
{{
  "match_score": 0,
  "skill_match": {{
    "matched": [],
    "missing": [],
    "score": 0
  }},
  "experience_match": {{
    "years": 0,
    "relevance": "",
    "score": 0
  }},
  "strengths": [],
  "weaknesses": [],
  "feedback": "",
  "recommendation": ""
}}
"""