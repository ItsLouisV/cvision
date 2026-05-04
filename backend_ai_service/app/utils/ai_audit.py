"""
AI AUDIT LOGGER — Ghi lại mọi quyết định AI
=============================================
Mục đích: Minh bạch hóa hoàn toàn.
Recruiter có thể xem lại bất kỳ quyết định nào AI từng đưa ra,
kể cả việc hệ thống đã điều chỉnh gì so với output gốc của AI.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.utils.logger import log_info, log_error

logger = logging.getLogger(__name__)


class AIAuditLogger:
    """
    Ghi log toàn bộ AI decisions để:
    1. Recruiter kiểm tra lại khi nghi ngờ
    2. Developer debug khi AI có behavior lạ
    3. Tương lai: train/fine-tune model tốt hơn
    """

    @staticmethod
    def log(
        action: str,
        entity_id: str,
        ai_raw_output: Any,
        final_output: Any,
        was_adjusted: bool,
        extra: dict = None,
    ) -> None:
        """
        Ghi log một AI decision.

        Args:
            action: Hành động AI thực hiện, vd: "interview_evaluation", "cv_analysis", "job_match"
            entity_id: ID liên quan (session_id, cv_id, application_id, ...)
            ai_raw_output: Output gốc từ AI (chưa qua rules)
            final_output: Output cuối sau khi đã áp dụng rules
            was_adjusted: True nếu rules đã can thiệp thay đổi output AI
            extra: Thông tin bổ sung tuỳ action
        """
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "entity_id": entity_id,
            "was_rule_adjusted": was_adjusted,
            "ai_raw_output": ai_raw_output,
            "final_output": final_output,
        }
        if extra:
            entry["extra"] = extra

        # Ghi ra log file/stdout để DevOps/admin có thể track
        if was_adjusted:
            log_info(
                "AI_AUDIT",
                f"[{action}] entity={entity_id} | ⚠️  AI output đã bị điều chỉnh bởi rules"
            )
        else:
            log_info(
                "AI_AUDIT",
                f"[{action}] entity={entity_id} | ✅ AI output hợp lệ, không cần điều chỉnh"
            )

        # Log chi tiết ở debug level (chỉ xuất hiện khi DEBUG=true)
        logger.debug(f"AI_AUDIT_DETAIL: {json.dumps(entry, ensure_ascii=False, default=str)}")

    @staticmethod
    async def log_to_supabase(
        supabase_client,
        action: str,
        entity_id: str,
        ai_raw_output: Any,
        final_output: Any,
        was_adjusted: bool,
        extra: dict = None,
    ) -> None:
        """
        Ghi log vào Supabase table 'ai_audit_logs' (nếu table tồn tại).
        Recruiter có thể vào dashboard xem toàn bộ AI decisions.
        Không raise exception nếu lỗi — audit log KHÔNG được block luồng chính.
        """
        try:
            entry = {
                "action": action,
                "entity_id": entity_id,
                "was_rule_adjusted": was_adjusted,
                "ai_raw_output": json.dumps(ai_raw_output, ensure_ascii=False, default=str),
                "final_output": json.dumps(final_output, ensure_ascii=False, default=str),
                "extra": json.dumps(extra or {}, ensure_ascii=False, default=str),
            }
            supabase_client.table("ai_audit_logs").insert(entry).execute()
        except Exception as e:
            # Lỗi audit KHÔNG được ảnh hưởng đến luồng chính
            log_error("AI_AUDIT_SUPABASE", f"Không thể ghi audit log: {e}")


# Singleton instance
ai_audit = AIAuditLogger()
