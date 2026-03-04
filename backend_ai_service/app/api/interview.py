from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from app.core.supabase import supabase
from app.services.interview_ai import interview_ai
import json
import uuid
import logging

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
            .select('*, jobs(*)') \
            .eq('id', session_id) \
            .execute()

        if not session.data:
            await websocket.send_json({"error": "Session không tồn tại"})
            await websocket.close()
            return

        session_data = session.data[0]
        job_data = session_data.get('jobs', {})

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

        active_sessions[session_id] = websocket

        # Gửi tin nhắn chào mừng
        await websocket.send_json({
            "type": "system",
            "content": f"Chào mừng đến với buổi phỏng vấn cho vị trí {job_data.get('title', 'không xác định')}!",
            "job_info": job_data
        })

        # Nếu chưa có tin nhắn, AI hỏi câu đầu tiên
        if len(history) == 0:
            first_question = await interview_ai.generate_question(
                job_title=job_data.get('title', ''),
                requirements=job_data.get('requirements', ''),
                history=[]
            )

            # Lưu câu hỏi
            supabase_client.table('interview_messages').insert({
                "session_id": session_id,
                "sender": "ai",
                "content": first_question['content']
            }).execute()

            await websocket.send_json(first_question)

        # Xử lý realtime chat
        while True:
            # Nhận tin nhắn từ ứng viên
            data = await websocket.receive_json()

            if data['type'] == 'answer':
                # Lưu câu trả lời
                supabase_client.table('interview_messages').insert({
                    "session_id": session_id,
                    "sender": "user",
                    "content": data['content']
                }).execute()

                # Cập nhật history
                history.append({"sender": "user", "content": data['content']})

                # AI sinh câu hỏi tiếp theo
                question = await interview_ai.generate_question(
                    job_title=job_data.get('title', ''),
                    requirements=job_data.get('requirements', ''),
                    history=history
                )

                # Lưu câu hỏi AI
                supabase_client.table('interview_messages').insert({
                    "session_id": session_id,
                    "sender": "ai",
                    "content": question['content']
                }).execute()

                # Gửi câu hỏi
                await websocket.send_json(question)

                # Nếu là câu cuối, đánh giá và kết thúc
                if question.get('type') == 'summary':
                    # Cập nhật session
                    supabase_client.table('interview_sessions') \
                        .update({
                        "status": "completed",
                        "overall_score": question.get('evaluation', {}).get('overall_score'),
                        "overall_feedback": question.get('content')
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


@router.post("/start")
async def start_interview(
        user_id: str,
        job_id: str = None
):
    """Bắt đầu buổi phỏng vấn mới"""

    supabase_client = supabase.get_client()

    # Tạo session mới
    session_data = {
        "user_id": user_id,
        "job_id": job_id,
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
        .select('*, jobs(title, company_name)') \
        .eq('user_id', user_id) \
        .order('created_at', desc=True) \
        .execute()

    return {"success": True, "sessions": result.data}