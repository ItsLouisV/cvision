from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from pydantic import BaseModel
from app.core.supabase import supabase
from app.services.interview_ai import interview_ai
import json
import uuid
import logging
from enum import Enum

class InterviewLanguage(Enum):
    VIETNAMESE = "Vietnamese"
    ENGLISH = "English"
    BILINGUAL = "Bilingual"

class StartInterviewRequest(BaseModel):
    user_id: str
    full_name: str = "Ứng viên"
    job_title: str
    level: str = "Junior"
    language: InterviewLanguage = InterviewLanguage.VIETNAMESE #mặc định là tiếng Việt.
    job_id: str = None

router = APIRouter(prefix="/interview", tags=["Interview"])
logger = logging.getLogger(__name__)

# Lưu trữ WebSocket connections
active_sessions = {}


@router.websocket("/ws/{session_id}")
async def websocket_interview(websocket: WebSocket, session_id: str):
    """WebSocket cho phỏng vấn realtime với AI"""

    await websocket.accept()

    try:
        supabase_client = supabase.get_client()

        # Lấy thông tin session
        session = supabase_client.table('interview_sessions') \
            .select('*, job_posts(*)') \
            .eq('id', session_id) \
            .execute()

        if not session.data:
            await websocket.send_json({"error": "Session không tồn tại"})
            await websocket.close()
            return

        session_data = session.data[0]
        job_data = session_data.get('job_posts', {})
        session_language = session_data.get('language', 'Vietnamese')
        
        # Lấy title / requirements từ custom field nếu không có job_id
        final_job_title = job_data.get('title') if job_data else session_data.get('custom_job_title', 'Không xác định')
        final_requirements = job_data.get('requirements', '') if job_data else f"Ứng viên apply vị trí {session_data.get('custom_level')}."

        # Lấy lịch sử tin nhắn
        messages = supabase_client.table('interview_messages') \
            .select('*') \
            .eq('session_id', session_id) \
            .order('created_at') \
            .execute()

        history = [
            {"sender": msg['sender'], "content": msg['content']}
            for msg in messages.data
        ]

        # Lấy CV mặc định của ứng viên để làm Context
        user_id = session_data.get('user_id')
        cv_text = "Không có thông tin CV."
        if user_id:
            cv_response = supabase_client.table('user_cvs') \
                .select('parsed_data, raw_text') \
                .eq('user_id', user_id) \
                .eq('is_default', True) \
                .execute()
            if cv_response.data:
                cv_data = cv_response.data[0]
                parsed = cv_data.get('parsed_data')
                if parsed:
                    cv_text = json.dumps(parsed, ensure_ascii=False)
                else:
                    cv_text = cv_data.get('raw_text', "Không có thông tin CV.")

        active_sessions[session_id] = websocket

        async def _run_ai_stream(user_answers_count: int, current_history: list):
            msg_id = str(uuid.uuid4())
            await websocket.send_json({"type": "stream_start", "id": msg_id})
            
            full_text = ""
            is_summary = False
            
            stream_gen = interview_ai.generate_question_stream(
                job_title=final_job_title,
                requirements=final_requirements,
                cv_data=cv_text,
                language=session_language,
                user_answers_count=user_answers_count,
                history=current_history
            )
            
            async for chunk in stream_gen:
                if not full_text and "[SUMMARY]" in chunk:
                    is_summary = True
                    chunk = chunk.replace("[SUMMARY]", "").lstrip()
                    
                if chunk:
                    full_text += chunk
                    await websocket.send_json({"type": "stream_chunk", "id": msg_id, "content": chunk})
            
            if "[SUMMARY]" in full_text:
                is_summary = True
                full_text = full_text.replace("[SUMMARY]", "").lstrip()

            await websocket.send_json({"type": "stream_end", "id": msg_id, "content": full_text})
            
            return {
                "type": "summary" if is_summary else "question",
                "content": full_text
            }

        # Gửi tin nhắn chào mừng
        await websocket.send_json({
            "type": "system",
            "content": f"Chào mừng đến với buổi phỏng vấn cho vị trí {final_job_title}!"
        })

        # Nếu chưa có tin nhắn, AI hỏi câu đầu tiên
        if len(history) == 0:
            first_question = await _run_ai_stream(0, [])

            # Lưu câu hỏi
            supabase_client.table('interview_messages').insert({
                "session_id": session_id,
                "sender": "ai",
                "content": first_question['content']
            }).execute()

        # Xử lý realtime chat
        while True:
            # Nhận tin nhắn từ ứng viên
            data = await websocket.receive_json()
            
            # Bỏ qua tin nhắn giữ kết nối (heartbeat ping)
            if data.get('type') == 'ping':
                continue

            if data.get('type') == 'answer':
                # Lưu câu trả lời
                supabase_client.table('interview_messages').insert({
                    "session_id": session_id,
                    "sender": "user",
                    "content": data['content']
                }).execute()

                # Cập nhật history
                history.append({"sender": "user", "content": data['content']})

                # Đếm số lượng câu trả lời của ứng viên
                user_answers_count = sum(1 for m in history if m['sender'] == 'user')

                if user_answers_count >= 15:
                    msg_id = str(uuid.uuid4())
                    await websocket.send_json({"type": "stream_start", "id": msg_id})
                    chunk = "Thời lượng phỏng vấn đã đạt tối đa 15 câu hỏi, Louis AI đã ghi nhận những câu trả lời của bạn. Rất cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Louis AI sẽ đưa ra kết quả phỏng vấn như sau."
                    await websocket.send_json({"type": "stream_chunk", "id": msg_id, "content": chunk})
                    await websocket.send_json({"type": "stream_end", "id": msg_id, "content": chunk})
                    question = {
                        "type": "summary",
                        "content": chunk
                    }
                else:
                    # AI sinh câu hỏi tiếp theo
                    question = await _run_ai_stream(user_answers_count, history)

                # Bảo vệ: Nếu dưới 4 câu mà AI định kết thúc, ép thành câu hỏi để hỏi tiếp
                if question.get('type') == 'summary' and user_answers_count < 4:
                    question['type'] = 'question'
                    question['content'] = question.get('content', '')

                # Lưu câu hỏi AI
                supabase_client.table('interview_messages').insert({
                    "session_id": session_id,
                    "sender": "ai",
                    "content": question['content']
                }).execute()

                # Nếu là câu cuối, chạy đánh giá chi tiết
                if question.get('type') == 'summary':
                    await websocket.send_json({
                        "type": "typing",
                        "content": "Đang phân tích điểm số và đánh giá tổng quan..."
                    })
                    eval_result = await interview_ai.evaluate_interview(
                        job_title=final_job_title,
                        language=session_language,
                        messages=history
                    )
                    eval_data = {
                        "overall_score": int(float(eval_result.get('overall_score', 0))),
                        "technical_score": int(float(eval_result.get('technical_score', 0))),
                        "communication_score": int(float(eval_result.get('communication_score', 0))),
                        "strengths": eval_result.get('strengths', []),
                        "weaknesses": eval_result.get('weaknesses', []),
                        "advice": eval_result.get('advice', '')
                    }
                    question['evaluation'] = eval_data
                    
                    # Gửi evaluation
                    await websocket.send_json({
                        "type": "summary",
                        "evaluation": eval_data
                    })
                    
                    eval_json_str = json.dumps(eval_data, ensure_ascii=False)
                    # Cập nhật session
                    supabase_client.table('interview_sessions') \
                        .update({
                        "status": "completed",
                        "overall_score": eval_data["overall_score"],
                        "overall_feedback": eval_json_str
                    }) \
                        .eq('id', session_id) \
                        .execute()

                    await websocket.close()
                    break

    except WebSocketDisconnect:
        logger.info(f"Session {session_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if session_id in active_sessions:
            del active_sessions[session_id]

@router.post("/stt/convert")
async def speech_to_text(file: UploadFile = File(...)):
    """Chuyển đổi file ghi âm giọng nói thành văn bản sử dụng Gemini"""
    try:
        from google import genai
        from app.core.gemini import gemini
        
        # 1. Đọc dữ liệu âm thanh
        file_bytes = await file.read()
        
        # 2. Xác định MIME type từ file upload (fallback audio/mp4 cho m4a)
        mime_type = file.content_type or "audio/mp4"
        logger.info(f"STT: Nhận file '{file.filename}', size={len(file_bytes)} bytes, mime={mime_type}")
        
        # 3. Đóng gói thành Part cho Gemini
        audio_part = genai.types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        
        # 4. Yêu cầu AI lắng nghe và chép chính tả
        prompt = "Listen to this audio and accurately transcribe it to text in the source language. Do not output anything else other than the transcription itself. Please ignore any background noise."
        
        # 5. Gọi Gemini — dùng trực tiếp client đã khởi tạo sẵn
        response = gemini.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, audio_part]
        )
        
        text = ""
        try:
            # Kiểm tra xem response có chứa text hợp lệ không
            if hasattr(response, 'text') and response.text:
                text = response.text.strip()
            else:
                # Nếu không có text, log lại để theo dõi nhưng không raise lỗi
                logger.warning("Gemini returned empty transcription (silent audio or safety block).")
        except Exception as inner_e:
            logger.error(f"Error accessing response.text: {inner_e}")
            text = ""

        # 6. Kiểm tra response có chứa lỗi từ Gemini không
        if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
            feedback = response.prompt_feedback
            if feedback.block_reason:
                logger.warning(f"Gemini blocked transcription due to: {feedback.block_reason}")
                # Trả về empty text nhưng báo lỗi rõ ràng
                return {
                    "success": False, 
                    "text": "",
                    "message": f"Không thể xử lý: {feedback.block_reason}"
                }

        logger.info(f"STT Transcript: '{text}'")
        
        return {
            "success": True, 
            "text": text,
            "message": "Nhận diện thành công" if text else "Không nghe rõ giọng nói"
        }
        
    except Exception as e:
        logger.error(f"Lỗi Voice-to-Text: {e}", exc_info=True)
        return {"success": False, "text": "", "detail": str(e)}

@router.post("/start")
async def start_interview(request: StartInterviewRequest):
    """Bắt đầu buổi phỏng vấn mới"""

    supabase_client = supabase.get_client()

    # Tạo session mới
    session_data = {
        "user_id": request.user_id,
        "job_id": request.job_id,
        "custom_job_title": request.job_title,
        "custom_level": request.level,
        "language": request.language.value,
        "status": "ongoing"
    }

    result = supabase_client.table('interview_sessions') \
        .insert(session_data) \
        .execute()

    session_id = result.data[0]['id']

    # Tạo WebSocket URL
    ws_url = f"/interview/ws/{session_id}"

    return {
        "success": True,
        "session_id": session_id,
        "websocket_url": ws_url,
        "message": "Kết nối WebSocket để bắt đầu phỏng vấn"
    }


@router.get("/history/{user_id}")
async def get_interview_history(user_id: str):
    """Lấy lịch sử phỏng vấn của user"""

    supabase_client = supabase.get_client()

    result = supabase_client.table('interview_sessions') \
        .select('*, job_posts(title, company_name)') \
        .eq('user_id', user_id) \
        .order('created_at', desc=True) \
        .execute()

    return {"success": True, "sessions": result.data}