"""
SCORING RULES — Quy tắc cứng kiểm soát AI
==========================================
Các hằng số và logic ở đây là LUẬT, không phải gợi ý.
AI có thể đưa ra bất kỳ điểm nào, nhưng layer này sẽ
điều chỉnh lại trước khi trả về cho client.
"""
from app.utils.logger import log_info


# ─── HẰNG SỐ ───────────────────────────────────────────────────────────────

class InterviewRules:
    """Quy tắc phỏng vấn — bất biến với AI"""

    # Số câu trả lời tối thiểu trước khi được phép kết thúc
    MIN_ANSWERS_TO_END = 4

    # Số câu tối đa (hệ thống cưỡng chế ngắt)
    MAX_QUESTIONS = 15

    # Nếu ứng viên trả lời < MIN_ANSWERS_FOR_SCORE câu → điểm tổng bị cap
    MIN_ANSWERS_FOR_SCORE = 3
    MAX_SCORE_BELOW_MIN_ANSWERS = 50

    # Giới hạn điểm hợp lệ
    SCORE_MIN = 0
    SCORE_MAX = 100

    # Điểm tổng không được lệch quá ngưỡng này so với trung bình tech+comm
    OVERALL_SCORE_TOLERANCE = 10

    @staticmethod
    def validate_and_fix(score_data: dict, answer_count: int) -> dict:
        """
        Hậu kiểm toàn bộ điểm AI đưa ra.
        Trả về dict đã được đảm bảo đúng quy tắc.
        """
        adjusted = False
        notes = []

        # Quy tắc 1: Clamp điểm về [0, 100]
        for field in ("overall_score", "technical_score", "communication_score"):
            raw = int(float(score_data.get(field, 0)))
            clamped = max(InterviewRules.SCORE_MIN, min(InterviewRules.SCORE_MAX, raw))
            if clamped != raw:
                score_data[field] = clamped
                adjusted = True
                notes.append(f"{field} clamped {raw}→{clamped}")
            else:
                score_data[field] = clamped

        # Quy tắc 2: Trả lời ít → điểm tổng không được cao bất thường
        if answer_count < InterviewRules.MIN_ANSWERS_FOR_SCORE:
            if score_data["overall_score"] > InterviewRules.MAX_SCORE_BELOW_MIN_ANSWERS:
                old = score_data["overall_score"]
                score_data["overall_score"] = InterviewRules.MAX_SCORE_BELOW_MIN_ANSWERS
                adjusted = True
                notes.append(
                    f"overall_score capped {old}→{InterviewRules.MAX_SCORE_BELOW_MIN_ANSWERS} "
                    f"(chỉ {answer_count} câu trả lời)"
                )

        # Quy tắc 3: Điểm tổng không được cao hơn trung bình tech+comm quá 10 điểm
        avg = (score_data["technical_score"] + score_data["communication_score"]) / 2
        max_allowed_overall = int(avg + InterviewRules.OVERALL_SCORE_TOLERANCE)
        if score_data["overall_score"] > max_allowed_overall:
            old = score_data["overall_score"]
            score_data["overall_score"] = max_allowed_overall
            adjusted = True
            notes.append(f"overall_score capped by avg rule {old}→{max_allowed_overall}")

        # Quy tắc 4: Phải có ít nhất 1 điểm mạnh và 1 điểm yếu khi hoàn thành phỏng vấn
        if not score_data.get("strengths"):
            score_data["strengths"] = ["Đã hoàn thành buổi phỏng vấn"]
            adjusted = True
            notes.append("strengths was empty → added default")

        if not score_data.get("weaknesses"):
            score_data["weaknesses"] = ["Cần thêm thời gian đánh giá"]
            adjusted = True
            notes.append("weaknesses was empty → added default")

        # Quy tắc 5: Advice không được rỗng
        if not score_data.get("advice", "").strip():
            score_data["advice"] = "Tiếp tục luyện tập và cải thiện kỹ năng chuyên môn."
            adjusted = True
            notes.append("advice was empty → added default")

        if adjusted:
            log_info("InterviewRules", f"Đã điều chỉnh điểm AI: {'; '.join(notes)}")
            score_data["_rule_adjusted"] = True  # Flag để audit biết
        else:
            score_data["_rule_adjusted"] = False

        return score_data


class JobMatchingRules:
    """Quy tắc ghép việc — AI chỉ gợi ý, recruiter quyết định"""

    # Ngưỡng vector similarity tối thiểu để hiển thị gợi ý
    MIN_VECTOR_SIMILARITY = 0.70

    # Ngưỡng để gửi notification "strong match"
    NOTIFICATION_THRESHOLD = 0.75

    # Giới hạn điểm hợp lệ từ AI
    SCORE_MIN = 0
    SCORE_MAX = 100

    # Khi thiếu kỹ năng bắt buộc → điểm bị cap
    MISSING_MUST_HAVE_SCORE_CAP = 40

    # Nhãn gợi ý AI (recruiter luôn là người ra quyết định cuối)
    RECOMMENDATIONS = {
        "STRONG_MATCH": (80, 100),   # AI gợi ý mạnh
        "GOOD_MATCH":   (60, 79),    # AI gợi ý xem xét
        "WEAK_MATCH":   (0, 59),     # AI gợi ý cần cân nhắc
    }

    @staticmethod
    def apply_business_rules(match_result: dict, must_have_skills: list = None) -> dict:
        """
        Áp dụng quy tắc kinh doanh lên kết quả match của AI.
        AI chỉ đề xuất — con người (recruiter) vẫn là người quyết định cuối.
        """
        must_have_skills = must_have_skills or []
        score = int(float(match_result.get("match_score", 0)))

        # Quy tắc 1: Clamp điểm
        score = max(JobMatchingRules.SCORE_MIN, min(JobMatchingRules.SCORE_MAX, score))
        match_result["match_score"] = score

        # Quy tắc 2: Kiểm tra kỹ năng bắt buộc
        missing = match_result.get("skill_match", {}).get("missing", [])
        missing_must_have = [s for s in must_have_skills if s in missing]

        if missing_must_have:
            # Hard rule: thiếu skill bắt buộc → cap điểm và đánh dấu
            if score > JobMatchingRules.MISSING_MUST_HAVE_SCORE_CAP:
                match_result["match_score"] = JobMatchingRules.MISSING_MUST_HAVE_SCORE_CAP
                log_info(
                    "JobMatchingRules",
                    f"Điểm bị cap {score}→{JobMatchingRules.MISSING_MUST_HAVE_SCORE_CAP} "
                    f"do thiếu skill bắt buộc: {missing_must_have}"
                )
            match_result["hard_reject_reason"] = (
                f"Thiếu kỹ năng bắt buộc: {', '.join(missing_must_have)}"
            )
            score = match_result["match_score"]

        # Quy tắc 3: Gắn nhãn gợi ý (AI recommendation — KHÔNG phải quyết định cuối)
        recommendation = "WEAK_MATCH"
        for label, (low, high) in JobMatchingRules.RECOMMENDATIONS.items():
            if low <= score <= high:
                recommendation = label
                break

        match_result["ai_recommendation"] = recommendation
        match_result["human_decision_required"] = True  # Luôn cần recruiter xác nhận

        return match_result


class CVAnalysisRules:
    """Quy tắc phân tích CV"""

    # Số năm kinh nghiệm tối đa hợp lệ (phát hiện hallucination)
    MAX_YEARS_EXPERIENCE = 50

    # Điểm CV hợp lệ
    SCORE_MIN = 0
    SCORE_MAX = 100

    # Mức lương tối thiểu và tối đa hợp lệ (triệu VND/tháng)
    SALARY_MIN_VND_MILLION = 1
    SALARY_MAX_VND_MILLION = 500

    @staticmethod
    def validate(analysis: dict) -> dict:
        """Kiểm tra và làm sạch output AI phân tích CV"""
        adjusted = False
        notes = []

        # Quy tắc 1: Clamp overall_score
        raw_score = int(float(analysis.get("overall_score", 0)))
        clamped = max(CVAnalysisRules.SCORE_MIN, min(CVAnalysisRules.SCORE_MAX, raw_score))
        if clamped != raw_score:
            analysis["overall_score"] = clamped
            adjusted = True
            notes.append(f"overall_score clamped {raw_score}→{clamped}")

        # Quy tắc 2: Năm kinh nghiệm không thể vô lý
        personal_info = analysis.get("personal_info", {})
        years_exp = personal_info.get("years_experience", 0)
        if isinstance(years_exp, (int, float)) and years_exp > CVAnalysisRules.MAX_YEARS_EXPERIENCE:
            personal_info["years_experience"] = CVAnalysisRules.MAX_YEARS_EXPERIENCE
            adjusted = True
            notes.append(f"years_experience capped {years_exp}→{CVAnalysisRules.MAX_YEARS_EXPERIENCE}")

        # Quy tắc 3: Gợi ý lương phải trong khung hợp lệ (nếu có)
        recs = analysis.get("recommendations", {})
        salary_str = recs.get("suggested_salary", "")
        if salary_str:
            # Thêm note rõ là gợi ý của AI, không phải cam kết
            recs["suggested_salary_note"] = (
                "Mức lương này là ước tính tham khảo từ AI, "
                "mức thực tế phụ thuộc vào nhà tuyển dụng."
            )

        if adjusted:
            log_info("CVAnalysisRules", f"Đã điều chỉnh phân tích CV: {'; '.join(notes)}")
            analysis["_rule_adjusted"] = True
        else:
            analysis["_rule_adjusted"] = False

        return analysis
