from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.core.supabase import supabase
from app.core.gemini import gemini
from app.services.cv_parser import cv_parser
from app.services.skill_extractor import skill_extractor
from app.prompts.cv_analysis import CV_ANALYSIS_PROMPT
from app.models.cv import CVAnalysisResponse  # Import model đã viết
from app.utils.logger import log_info, log_error  # Sử dụng logger tập trung
import uuid
import json
import urllib.parse

router = APIRouter(prefix="/cv", tags=["CV"])


@router.post("/upload", response_model=None)  # Bạn có thể để CVAnalysisResponse nếu muốn validate chặt
async def upload_cv(
        user_id: str,
        file: UploadFile = File(...)
):
    """Upload và phân tích CV bằng AI"""
    log_info("CV_API", f"Bắt đầu xử lý upload cho user: {user_id}")

    try:
        # Giải mã tên file tiếng Việt (tránh trường hợp bị URL-encoded như Nguye%cc%82%cc%83n%20)
        safe_filename = urllib.parse.unquote(file.filename)

        # 1. Validate file dựa trên config
        content = await file.read()
        ext = safe_filename.lower().split('.')[-1]
        allowed_exts = ['pdf']

        if ext not in allowed_exts:
            raise HTTPException(400, f"Chỉ hỗ trợ các định dạng: {', '.join(allowed_exts)}")

        # 2. Parse CV to text (Đã bao gồm clean_text bên trong service)
        cv_text = await cv_parser.parse(content, safe_filename)

        # 3. Upload to Supabase Storage
        supabase_client = supabase.get_client()
        file_path = f"cvs/{user_id}/{uuid.uuid4()}.{ext}"

        supabase_client.storage \
            .from_('cvs') \
            .upload(file_path, content, file_options={"content-type": file.content_type})

        file_url = supabase_client.storage \
            .from_('cvs') \
            .get_public_url(file_path)

        # 4. AI Analysis with Gemini (Sử dụng Prompt từ file prompts)
        prompt = CV_ANALYSIS_PROMPT.format(cv_text=cv_text[:15000])  # Nới rộng context
        analysis = await gemini.generate_json(prompt)

        # 5. Generate embedding vector cho CV (Dùng dữ liệu đã phân tích để tăng độ chính xác)
        core_skills = ", ".join(analysis.get('skills', {}).get('top_skills', []))
        tech_skills = ", ".join([skill['name'] for skill in analysis.get('skills', {}).get('technical', [])])
        current_pos = analysis.get('personal_info', {}).get('current_position', '')
        # Chỉ nhúng các từ khóa cốt lõi để tránh Vector Match bị nhiễu
        cv_core_text = f"Vị trí: {current_pos}. Kỹ năng chính: {core_skills}, {tech_skills}."
        
        embedding = await gemini.generate_embedding(cv_core_text)

        # 6. Extract skills & Years of Experience
        extracted_skills = skill_extractor.extract_skills(cv_text)

        # 7. Chuẩn bị dữ liệu lưu database
        cv_data = {
            "user_id": user_id,
            "file_name": safe_filename,
            "file_url": file_url,
            "is_default": True,
            "raw_text": cv_text[:2000],  # Lưu đoạn đầu để preview
            "parsed_data": analysis,
            "embedding": embedding
        }

        # Set các CV cũ không còn là mặc định
        supabase_client.table('user_cvs') \
            .update({"is_default": False}) \
            .eq("user_id", user_id) \
            .execute()

        # Insert CV mới
        result = supabase_client.table('user_cvs').insert(cv_data).execute()
        cv_id = result.data[0]['id']

        # 8. Cập nhật User Skills vào DB (Dùng skill_extractor đã chuẩn hóa)
        for skill in extracted_skills['technical']:
            # Tìm hoặc tạo skill trong bảng Master Skills
            skill_res = supabase_client.table('skills').select('id').eq('name', skill['name']).execute()

            if skill_res.data:
                skill_id = skill_res.data[0]['id']
            else:
                new_skill = supabase_client.table('skills').insert({
                    "name": skill['name'],
                    "category": skill['category']
                }).execute()
                skill_id = new_skill.data[0]['id']

            # Upsert vào bảng user_skills
            try:
                supabase_client.table('user_skills').upsert({
                    "user_id": user_id,
                    "skill_id": skill_id,
                    "proficiency_level": 3  # Mặc định là Intermediate
                }, on_conflict="user_id, skill_id").execute()
            except Exception as upsert_err:
                log_error("SKILL_UPSERT", f"Bỏ qua lỗi trùng skill: {upsert_err}")

        # 9. Tìm Job phù hợp (Vector Search)
        matching_jobs = await find_matching_jobs(embedding)

        # 10. Tạo thông báo nếu có job tốt
        if matching_jobs and len(matching_jobs) > 0:
            supabase_client.table('notifications').insert({
                "user_id": user_id,
                "title": "🎯 Phát hiện công việc phù hợp!",
                "content": f"Hệ thống tìm thấy {len(matching_jobs)} công việc khớp với CV mới của bạn.",
                "data": {"jobs": matching_jobs[:3]}
            }).execute()

        log_info("CV_API", f"Xử lý thành công CV ID: {cv_id}")

        return {
            "success": True,
            "cv_id": cv_id,
            "analysis": analysis,
            "matching_jobs": matching_jobs[:5],
            "skills_found": extracted_skills
        }

    except Exception as e:
        log_error("CV_UPLOAD", str(e))
        raise HTTPException(500, f"Lỗi xử lý hệ thống: {str(e)}")


async def find_matching_jobs(cv_embedding: list):
    """Tìm job bằng Vector Similarity RPC"""
    try:
        supabase_client = supabase.get_client()
        result = supabase_client.rpc(
            'match_jobs',
            {
                'query_embedding': cv_embedding,
                'match_threshold': 0.75,
                'match_count': 10
            }
        ).execute()
        return result.data
    except Exception as e:
        log_error("VECTOR_MATCH", str(e))
        return []


@router.get("/{cv_id}")
async def get_cv(cv_id: str):
    """Lấy chi tiết CV"""
    supabase_client = supabase.get_client()
    result = supabase_client.table('user_cvs').select('*, user_profiles(*)').eq('id', cv_id).execute()

    if not result.data:
        raise HTTPException(404, "Không tìm thấy dữ liệu CV")

    return {"success": True, "data": result.data[0]}