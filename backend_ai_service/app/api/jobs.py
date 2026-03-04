from fastapi import APIRouter, HTTPException, Query
from app.core.supabase import supabase
from app.core.gemini import gemini
from app.prompts.job_matching import JOB_MATCHING_PROMPT
import uuid
import logging

router = APIRouter(prefix="/jobs", tags=["Jobs"])
logger = logging.getLogger(__name__)


@router.post("/create")
async def create_job(
        employer_id: str,
        title: str,
        description: str,
        requirements: str = None,
        salary_from: float = None,
        salary_to: float = None,
        location: str = None,
        job_type: str = None
):
    """Tạo job mới và tạo embedding cho AI matching"""

    try:
        supabase_client = supabase.get_client()

        # Tạo embedding từ description + requirements
        job_text = f"{title}\n{description}\n{requirements}"
        embedding = await gemini.generate_embedding(job_text)

        job_data = {
            "employer_id": employer_id,
            "title": title,
            "description": description,
            "requirements": requirements,
            "salary_from": salary_from,
            "salary_to": salary_to,
            "location": location,
            "job_type": job_type,
            "status": "active",
            "job_embedding": embedding
        }

        result = supabase_client.table('jobs') \
            .insert(job_data) \
            .execute()

        # Tìm ứng viên phù hợp ngay lập tức
        await notify_matching_candidates(result.data[0]['id'], embedding)

        return {"success": True, "job": result.data[0]}

    except Exception as e:
        logger.error(f"Job creation error: {e}")
        raise HTTPException(500, f"Lỗi tạo job: {str(e)}")


async def notify_matching_candidates(job_id: str, job_embedding: list):
    """Thông báo cho ứng viên phù hợp"""
    supabase_client = supabase.get_client()

    # Lấy tất cả CV có embedding
    cvs = supabase_client.table('user_cvs') \
        .select('id, user_id, embedding') \
        .not_.is_('embedding', 'null') \
        .execute()

    matches = []
    for cv in cvs.data:
        # Tính similarity
        similarity = supabase_client.rpc(
            'cosine_similarity',
            {
                'vec1': cv['embedding'],
                'vec2': job_embedding
            }
        ).execute()

        if similarity.data > 0.75:  # 75% match
            matches.append({
                'user_id': cv['user_id'],
                'score': similarity.data
            })

    # Tạo thông báo cho top 10 ứng viên
    for match in matches[:10]:
        notification = {
            "user_id": match['user_id'],
            "title": "🎯 Công việc mới phù hợp với bạn!",
            "content": f"Có một công việc mới với độ phù hợp {int(match['score'] * 100)}%",
            "data": {"job_id": job_id, "match_score": match['score']}
        }
        supabase_client.table('notifications').insert(notification).execute()


@router.post("/apply")
async def apply_job(
        job_id: str,
        user_id: str,
        cv_id: str,
        cover_letter: str = None
):
    """Ứng tuyển công việc với AI analysis"""

    try:
        supabase_client = supabase.get_client()

        # Lấy thông tin CV và Job
        cv = supabase_client.table('user_cvs') \
            .select('parsed_data, embedding') \
            .eq('id', cv_id) \
            .execute()

        job = supabase_client.table('jobs') \
            .select('*') \
            .eq('id', job_id) \
            .execute()

        if not cv.data or not job.data:
            raise HTTPException(404, "Không tìm thấy CV hoặc Job")

        # AI phân tích độ phù hợp
        prompt = JOB_MATCHING_PROMPT.format(
            cv_analysis=json.dumps(cv.data[0]['parsed_data']),
            job_details=json.dumps(job.data[0])
        )

        ai_analysis = await gemini.generate_json(prompt)

        # Tính similarity từ embeddings
        similarity = supabase_client.rpc(
            'cosine_similarity',
            {
                'vec1': cv.data[0]['embedding'],
                'vec2': job.data[0]['job_embedding']
            }
        ).execute()

        # Kết hợp điểm từ AI và vector similarity
        final_score = int((ai_analysis.get('match_score', 0) + similarity.data * 100) / 2)

        # Tạo application
        application = {
            "job_id": job_id,
            "user_id": user_id,
            "cv_id": cv_id,
            "cover_letter": cover_letter,
            "status": "pending",
            "ai_match_score": final_score,
            "ai_feedback": ai_analysis
        }

        result = supabase_client.table('applications') \
            .insert(application) \
            .execute()

        # Thông báo cho employer
        notification = {
            "user_id": job.data[0]['employer_id'],
            "title": "📬 Có ứng viên mới!",
            "content": f"Ứng viên đã ứng tuyển vị trí {job.data[0]['title']}",
            "data": {"application_id": result.data[0]['id']}
        }
        supabase_client.table('notifications').insert(notification).execute()

        return {
            "success": True,
            "application": result.data[0],
            "match_score": final_score,
            "ai_feedback": ai_analysis
        }

    except Exception as e:
        logger.error(f"Job application error: {e}")
        raise HTTPException(500, f"Lỗi ứng tuyển: {str(e)}")


@router.get("/recommendations/{user_id}")
async def get_recommendations(user_id: str):
    """Lấy job recommendations dựa trên CV mới nhất"""

    supabase_client = supabase.get_client()

    # Lấy CV mới nhất có embedding
    cv = supabase_client.table('user_cvs') \
        .select('embedding') \
        .eq('user_id', user_id) \
        .order('created_at', desc=True) \
        .limit(1) \
        .execute()

    if not cv.data or not cv.data[0]['embedding']:
        return {"success": True, "jobs": []}

    # Tìm job phù hợp
    matching_jobs = supabase_client.rpc(
        'match_jobs',
        {
            'query_embedding': cv.data[0]['embedding'],
            'match_threshold': 0.6,
            'match_count': 20
        }
    ).execute()

    return {
        "success": True,
        "jobs": matching_jobs.data,
        "total": len(matching_jobs.data)
    }