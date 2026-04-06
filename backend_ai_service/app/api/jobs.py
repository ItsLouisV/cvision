
import json
import logging
import uuid
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.core.supabase import supabase
from app.core.gemini import gemini
from app.prompts.job_matching import JOB_MATCHING_PROMPT

router = APIRouter(prefix="/jobs", tags=["Jobs"])
logger = logging.getLogger(__name__)


class JobCreateRequest(BaseModel):
    employer_id: str
    user_id: str
    company_name: str
    title: str
    description: str
    requirements: Optional[str] = None
    location: Optional[str] = None
    salary_from: Optional[float] = 0.0
    salary_to: Optional[float] = 0.0
    salary_unit: Optional[str] = 'month'
    currency: Optional[str] = 'VND'
    expired_at: Optional[str] = None
    category: Optional[str] = None
    job_type: str


# --- HÀM XỬ LÝ THÔNG BÁO NGẦM (BACKGROUND) ---

async def notify_matching_candidates(job_id: str, job_title: str, company_name: str, job_embedding: List[float]):
    """Tìm ứng viên phù hợp bằng Vector Search và gửi thông báo cá nhân hóa"""
    try:
        supabase_client = supabase.get_client()

        # 1. Tìm ứng viên bằng Vector Similarity (RPC match_candidates)
        matches = supabase_client.rpc('match_candidates', {
            'query_embedding': job_embedding,
            'match_threshold': 0.70,  # Ngưỡng tối thiểu để được gợi ý
            'match_count': 20
        }).execute()

        if not matches.data: return

        notifications = []
        for match in matches.data:
            score = int(match['similarity'] * 100)

            # Chỉ bắn thông báo nếu điểm Match thực sự cao (> 75%)
            if score >= 75:
                notifications.append({
                    "user_id": match['user_id'],
                    "title": f"🎯 Việc làm mới: {job_title}",
                    "content": f"{company_name} vừa đăng tuyển. Hồ sơ của bạn khớp {score}% với yêu cầu này!",
                    "data": {
                        "type": "match",  # Để Mobile hiện icon sparkles
                        "job_id": job_id,
                        "match_score": score
                    }
                })

        if notifications:
            supabase_client.table('notifications').insert(notifications).execute()
            logger.info(f"Đã gửi {len(notifications)} thông báo tới ứng viên phù hợp.")

    except Exception as e:
        logger.error(f"Lỗi gửi thông báo ngầm: {e}")


# --- CÁC API ENDPOINTS ---

@router.post("/create")
async def create_job(request: JobCreateRequest, background_tasks: BackgroundTasks):
    try:
        supabase_client = supabase.get_client()

        # 0. Xử lý logic Ngày/Giờ hết hạn
        now = datetime.now(timezone.utc)

        # Mặc định an toàn là 15 ngày nếu có sự cố
        final_expired_at = now + timedelta(days=15)

        if request.expired_at:
            try:
                # Chuyển ISO string từ App gửi lên thành object datetime
                # .replace('Z', '+00:00') để đảm bảo Python hiểu đúng múi giờ UTC
                user_selected_date = datetime.fromisoformat(request.expired_at.replace('Z', '+00:00'))

                # KIỂM TRA 1: Nếu người dùng chọn ngày trong tương lai (dù chỉ là 1 tiếng sau)
                if user_selected_date > now:
                    final_expired_at = user_selected_date
                    logger.info(f"Sử dụng ngày người dùng chọn: {final_expired_at}")
                else:
                    # KIỂM TRA 2: Nếu lỡ chọn ngày quá khứ (do lag hoặc chọn nhầm)
                    # Ta ép về 24 giờ tới để tin vẫn được đăng thành công
                    final_expired_at = now + timedelta(days=1)
                    logger.warning("Người dùng chọn ngày quá khứ, ép về +1 ngày.")

            except Exception as e:
                logger.error(f"Lỗi parse ngày tháng: {e}. Sử dụng mặc định 15 ngày.")
                # final_expired_at giữ nguyên là now + 15 days

        # 1. Tạo Embedding cho Job (Dùng Gemini)
        job_core_text = f"{request.title} tại {request.company_name}. {request.description} {request.requirements}"
        embedding = await gemini.generate_embedding(job_core_text)

        # 2. Lưu Job vào Database
        job_data = {
            **request.model_dump(),
            "expired_at": final_expired_at.isoformat(),
            "is_active": True,
            "embedding": embedding
        }

        result = supabase_client.table('job_posts').insert(job_data).execute()
        new_job = result.data[0]

        # 3. CHẠY NGẦM: Tìm và thông báo cho ứng viên (App không phải chờ)
        background_tasks.add_task(
            notify_matching_candidates,
            new_job['id'],
            request.title,
            request.company_name,
            embedding
        )

        return {"success": True, "job": new_job}
    except Exception as e:
        logger.error(f"Lỗi tạo Job: {e}")
        raise HTTPException(500, str(e))


@router.post("/apply")
async def apply_job(job_id: str, user_id: str, cv_id: str, cover_letter: str = None):
    try:
        supabase_client = supabase.get_client()

        # Lấy dữ liệu CV và Job
        cv = supabase_client.table('user_cvs').select('parsed_data, embedding').eq('id', cv_id).single().execute()
        job = supabase_client.table('job_posts').select('*').eq('id', job_id).single().execute()

        # AI Phân tích Match Score
        prompt = JOB_MATCHING_PROMPT.format(
            cv_analysis=json.dumps(cv.data['parsed_data']),
            job_details=json.dumps(job.data)
        )
        ai_analysis = await gemini.generate_json(prompt)
        final_score = ai_analysis.get('match_score', 0)

        # 1. Lưu đơn ứng tuyển
        application_data = {
            "job_id": job_id, "user_id": user_id, "cv_id": cv_id,
            "status": "pending", "ai_match_score": final_score,
            "ai_feedback": ai_analysis
        }
        res = supabase_client.table('applications').insert(application_data).execute()

        # 2. Thông báo cho Nhà tuyển dụng (Type: status)
        notif_employer = {
            "user_id": job.data['user_id'],
            "title": "📬 Ứng viên mới!",
            "content": f"Một ứng viên vừa nộp đơn vào vị trí {job.data['title']}. Độ hợp: {final_score}%",
            "data": {"type": "status", "job_id": job_id, "application_id": res.data[0]['id']}
        }

        # 3. Thông báo cho Ứng viên (Type: system)
        notif_candidate = {
            "user_id": user_id,
            "title": "✅ Ứng tuyển thành công",
            "content": f"Hồ sơ của bạn đã được gửi tới {job.data['company_name']}.",
            "data": {"type": "system", "job_id": job_id}
        }

        supabase_client.table('notifications').insert([notif_employer, notif_candidate]).execute()

        return {"success": True, "match_score": final_score}
    except Exception as e:
        logger.error(f"Lỗi ứng tuyển: {e}")
        raise HTTPException(500, str(e))