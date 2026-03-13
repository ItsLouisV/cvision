# 🎯 CVision — Hệ thống AI Hỗ trợ Tìm việc & Phỏng vấn

> **AI-powered Job Matching & Mock Interview System**
>
> Nền tảng thông minh giúp sinh viên và người tìm việc **phân tích CV**, **tìm việc phù hợp bằng AI**, và **luyện phỏng vấn realtime với AI Interviewer** — tất cả trong một ứng dụng di động duy nhất.

---

## 📋 Mục lục

- [Tổng quan kiến trúc](#-tổng-quan-kiến-trúc)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Hướng dẫn cài đặt Backend](#-1-cài-đặt-backend-backend_ai_service)
- [Hướng dẫn cài đặt Frontend](#-2-cài-đặt-frontend-frontend_new)
- [Chi tiết các biến môi trường (.env)](#-chi-tiết-các-biến-môi-trường-env)
- [Cấu trúc thư mục chi tiết](#-cấu-trúc-thư-mục-chi-tiết)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Database Schema (Supabase)](#-database-schema-supabase)
- [Luồng hoạt động chính](#-luồng-hoạt-động-chính)
- [Những chỗ BẠN CẦN THAY ĐỔI khi clone project](#-những-chỗ-bạn-cần-thay-đổi-khi-clone-project)
- [FAQ & Troubleshooting](#-faq--troubleshooting)

---

## 🏗 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                    CVision System Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────────────────┐  │
│  │  📱 Mobile App   │  HTTP   │  🐍 Backend AI Service       │  │
│  │  (React Native/  │◄──────►│  (FastAPI + Python)           │  │
│  │   Expo Router)   │  WS    │                               │  │
│  │                  │◄──────►│  ┌───────────────────────┐    │  │
│  │  • Auth (Supa)   │        │  │ 🤖 Google Gemini AI   │    │  │
│  │  • CV Upload     │        │  │   (Primary Engine)    │    │  │
│  │  • Job Browse    │        │  ├───────────────────────┤    │  │
│  │  • AI Interview  │        │  │ 🔄 DeepSeek AI        │    │  │
│  │  • Profile       │        │  │   (Fallback Engine)   │    │  │
│  │                  │        │  ├───────────────────────┤    │  │
│  └──────────────────┘        │  │ 📊 Embeddings         │    │  │
│           │                  │  │   Gemini → Local FB   │    │  │
│           │ Auth / DB        │  └───────────────────────┘    │  │
│           ▼                  │            │                   │  │
│  ┌──────────────────┐        │            │ CRUD / Vector     │  │
│  │ 🗄️ Supabase      │◄───────┼────────────┘                  │  │
│  │  • PostgreSQL    │        │                               │  │
│  │  • pgvector      │        └──────────────────────────────┘  │
│  │  • Storage (CVs) │                                          │
│  │  • Auth          │                                          │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Công nghệ sử dụng

| Thành phần     | Công nghệ                                                                |
| -------------- | ------------------------------------------------------------------------ |
| **Backend**    | Python 3.10+, FastAPI, Uvicorn, WebSockets                              |
| **AI Engine**  | Google Gemini (`gemini-3.1-flash-lite-preview`), DeepSeek (fallback)     |
| **Embeddings** | Gemini Embedding (`gemini-embedding-001`), SentenceTransformers (fallback)|
| **Database**   | Supabase (PostgreSQL + pgvector + Auth + Storage)                        |
| **Frontend**   | React Native 0.81, Expo SDK 54, Expo Router v6, TypeScript              |
| **UI**         | Lucide Icons, Phosphor Icons, React Native Reanimated, Expo Blur        |
| **Audio**      | expo-audio (ghi âm), Gemini STT (chuyển giọng nói → text)              |

---

## 💻 Yêu cầu hệ thống

### Backend
- **Python** >= 3.10
- **pip** (trình quản lý gói Python)
- Kết nối Internet (để gọi Gemini AI API & Supabase)

### Frontend
- **Node.js** >= 18
- **npm** >= 9
- **Expo Go** app trên điện thoại (Android/iOS) — hoặc Android Emulator / iOS Simulator
- Cùng mạng WiFi với máy chạy Backend (nếu test trên thiết bị thật)

---

## 🐍 1. Cài đặt Backend (`backend_ai_service`)

### Bước 1: Di chuyển vào thư mục backend

```bash
cd backend_ai_service
```

### Bước 2: Tạo môi trường ảo & cài đặt thư viện

```bash
# Tạo virtual environment
python -m venv .venv

# Kích hoạt (chọn theo hệ điều hành):
# Windows (CMD):
.venv\Scripts\activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

**Danh sách thư viện chính** (`requirements.txt`):
```
fastapi==0.128.1
uvicorn[standard]==0.40.0
supabase==2.27.3
google-genai==1.66.0
pypdf==6.7.0
python-docx==1.2.0
python-multipart==0.0.22
python-dotenv==1.2.1
websockets==15.0.1
openai==2.26.0
sentence-transformers==5.2.3
```

### Bước 3: Cấu hình file `.env`

Tạo file `backend_ai_service/.env` với nội dung:

```env
# ============================================
# 🔑 SUPABASE — Thay bằng thông tin project của bạn
# ============================================
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co          # ← THAY Ở ĐÂY
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...              # ← THAY Ở ĐÂY (Service Role Key)

# ============================================
# 🤖 GEMINI AI — Lấy từ https://aistudio.google.com/apikey
# ============================================
GEMINI_API_KEY=AIzaSy...                                   # ← THAY Ở ĐÂY

# ============================================
# 🔄 DEEPSEEK AI (Fallback, tuỳ chọn) — Lấy từ https://platform.deepseek.com
# ============================================
DEEPSEEK_API_kEY=sk-...                                   # ← THAY Ở ĐÂY (hoặc để trống nếu không dùng)
```

> ⚠️ **LƯU Ý**: Backend sử dụng `SUPABASE_SERVICE_KEY` (Service Role Key, có full quyền), KHÔNG phải Anon Key. Lấy tại [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

### Bước 4: Chạy Backend Server

```bash
python run.py
```

Hoặc chạy trực tiếp bằng Uvicorn:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Nếu thành công, terminal sẽ hiển thị:
```
🚀 Khởi động Job Match AI Service...
✅ Supabase ready
✅ Gemini AI ready
🎯 Service sẵn sàng!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

📌 **Kiểm tra nhanh**: Mở trình duyệt tại `http://localhost:8000/health` — sẽ trả về:
```json
{"status": "healthy", "service": "Job Match AI", "version": "1.0.0"}
```

📌 **API Docs tự động**: Truy cập `http://localhost:8000/docs` để xem Swagger UI.

---

## 📱 2. Cài đặt Frontend (`frontend_new`)

### Bước 1: Di chuyển vào thư mục frontend

```bash
cd frontend_new
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình file `.env`

Tạo file `frontend_new/.env` với nội dung:

```env
# ============================================
# 🔑 SUPABASE — Dùng Anon Key (public, giới hạn quyền theo RLS)
# ============================================
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co      # ← THAY Ở ĐÂY
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...             # ← THAY Ở ĐÂY (Anon Key)

# ============================================
# 🌐 BACKEND API URL — Trỏ đến máy chạy Backend
# ============================================
EXPO_PUBLIC_API_URL=http://192.168.1.14:8000/api/v1                # ← THAY Ở ĐÂY
```

> ⚠️ **QUAN TRỌNG về `EXPO_PUBLIC_API_URL`**:
> - Nếu chạy trên **Emulator cùng máy**: dùng `http://10.0.2.2:8000/api/v1` (Android) hoặc `http://localhost:8000/api/v1` (iOS Simulator)
> - Nếu chạy trên **điện thoại thật**: dùng IP LAN của máy tính (ví dụ `http://192.168.1.14:8000/api/v1`). Tìm IP bằng lệnh `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux).
> - Đảm bảo điện thoại và máy tính **cùng một mạng WiFi**.

### Bước 4: Khởi chạy ứng dụng

```bash
npx expo start -c
```

Sau khi chạy:
- Nhấn **`a`** → Mở trên **Android Emulator**
- Nhấn **`i`** → Mở trên **iOS Simulator**
- Quét **QR code** bằng app **Expo Go** trên điện thoại thật

---

## 🔐 Chi tiết các biến môi trường (.env)

### Backend (`backend_ai_service/.env`)

| Biến                   | Mô tả                                               | Bắt buộc  | Cách lấy                                                         |
| ---------------------- | ---------------------------------------------------- | --------- | ---------------------------------------------------------------- |
| `SUPABASE_URL`         | URL dự án Supabase                                   | ✅ Có     | [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Service Role Key (full quyền, server-side only)      | ✅ Có     | Supabase Dashboard → Settings → API → `service_role` key        |
| `GEMINI_API_KEY`       | API Key Google Gemini AI                             | ✅ Có     | [Google AI Studio](https://aistudio.google.com/apikey)           |
| `DEEPSEEK_API_kEY`    | API Key DeepSeek (fallback khi Gemini lỗi)           | ❌ Không  | [DeepSeek Platform](https://platform.deepseek.com)               |

### Frontend (`frontend_new/.env`)

| Biến                           | Mô tả                                         | Bắt buộc  | Cách lấy                                                         |
| ------------------------------ | ---------------------------------------------- | --------- | ---------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`     | URL dự án Supabase (giống backend)             | ✅ Có     | Giống `SUPABASE_URL` ở backend                                  |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`| Anon Key (public, bị giới hạn bởi RLS)        | ✅ Có     | Supabase Dashboard → Settings → API → `anon` key                |
| `EXPO_PUBLIC_API_URL`          | URL đầy đủ đến Backend API (bao gồm `/api/v1`)| ✅ Có     | IP máy chạy backend + port 8000 + `/api/v1`                     |

---

## 📁 Cấu trúc thư mục chi tiết

```
CVision/
├── README.md
│
├── backend_ai_service/          # 🐍 Backend Python (FastAPI)
│   ├── .env                     # ← Biến môi trường (BẠN TẠO)
│   ├── requirements.txt         # Danh sách thư viện Python
│   ├── run.py                   # Entry point — chạy server
│   └── app/
│       ├── main.py              # FastAPI app + CORS + Router setup
│       ├── api/                 # 📡 API Routes
│       │   ├── cv.py            #   POST /cv/upload, GET /cv/{cv_id}
│       │   ├── jobs.py          #   POST /jobs/create, POST /jobs/apply
│       │   ├── interview.py     #   POST /interview/start, WS /interview/ws/{id}
│       │   │                    #   POST /interview/stt/convert
│       │   │                    #   GET  /interview/history/{user_id}
│       │   ├── auth.py          #   (Reserved)
│       │   └── notifications.py #   (Reserved)
│       ├── core/                # ⚙️ Core Services
│       │   ├── config.py        #   Tải .env, cấu hình model AI & thresholds
│       │   ├── gemini.py        #   GeminiService (text gen + JSON gen + fallback DeepSeek)
│       │   ├── embeddings.py    #   EmbeddingService (Gemini → Local fallback)
│       │   └── supabase.py      #   SupabaseClient wrapper
│       ├── services/            # 🧠 Business Logic
│       │   ├── cv_parser.py     #   Parse PDF/DOCX → plain text
│       │   ├── skill_extractor.py#  Trích xuất kỹ năng từ CV text
│       │   └── interview_ai.py  #   Tạo câu hỏi & đánh giá phỏng vấn
│       ├── models/              # 📦 Pydantic Models
│       │   ├── cv.py            #   CVAnalysisResponse
│       │   ├── job.py           #   Job models
│       │   └── interview.py     #   Interview models
│       ├── prompts/             # 💬 AI Prompt Templates
│       │   ├── cv_analysis.py   #   Prompt phân tích CV
│       │   ├── job_matching.py  #   Prompt đối chiếu CV ↔ Job
│       │   └── interview.py     #   Prompt phỏng vấn AI
│       └── utils/               # 🔧 Utilities
│           ├── formatters.py    #   Format helpers
│           ├── logger.py        #   Centralized logging
│           ├── pdf_handler.py   #   PDF processing
│           └── vector_math.py   #   Vector utilities
│
└── frontend_new/                # 📱 Mobile App (React Native / Expo)
    ├── .env                     # ← Biến môi trường (BẠN TẠO)
    ├── package.json             # Dependencies & scripts
    ├── app.json                 # Expo config (tên app, icon, plugins)
    ├── config.ts                # Đọc env vars → ENV object
    ├── tsconfig.json
    ├── app/                     # 📲 Screens (Expo Router - file-based routing)
    │   ├── _layout.tsx          #   Root layout
    │   ├── index.tsx            #   Splash / Landing screen
    │   ├── (auth)/              #   🔒 Auth screens
    │   │   ├── login.tsx
    │   │   ├── register.tsx
    │   │   ├── forgot-password.tsx
    │   │   └── reset-password.tsx
    │   ├── (tabs)/              #   📑 Tab Navigation
    │   │   ├── _layout.tsx      #     Tab bar config
    │   │   ├── home/            #     🏠 Trang chủ (danh sách việc làm)
    │   │   ├── analysis/        #     📊 Phân tích CV (upload & xem kết quả)
    │   │   ├── activity/        #     📋 Hoạt động (đăng tin - employer)
    │   │   └── profile/         #     👤 Hồ sơ cá nhân
    │   ├── interview/           #   🎤 Phỏng vấn AI (WebSocket realtime)
    │   │   └── [session_id].tsx #     Màn hình phỏng vấn (chat + ghi âm)
    │   ├── jobs/                #   💼 Chi tiết công việc
    │   │   └── [id].tsx         #     Xem & ứng tuyển job
    │   ├── analysis_history/    #   📜 Lịch sử phân tích CV
    │   ├── histories/           #   📚 Lịch sử phỏng vấn
    │   ├── notifications/       #   🔔 Thông báo
    │   ├── settings/            #   ⚙️ Cài đặt
    │   └── modal/               #   🪟 Modal screens
    ├── components/              # 🧩 Reusable Components
    ├── constants/               # 🎨 Theme colors, layout constants
    ├── hooks/                   # 🪝 Custom React hooks
    ├── lib/
    │   └── supabase.ts          # Supabase client init (dùng Anon Key)
    └── assets/                  # 🖼️ Images, icons, fonts
```

---

## 📡 API Endpoints Reference

Tất cả endpoints đều có prefix: **`/api/v1`**

### 📄 CV Module (`/api/v1/cv`)

| Method | Endpoint          | Mô tả                                        | Input                         |
| ------ | ----------------- | --------------------------------------------- | ----------------------------- |
| `POST` | `/cv/upload`      | Upload CV (PDF/DOCX) → AI phân tích & lưu DB | `user_id` (query), `file` (form) |
| `GET`  | `/cv/{cv_id}`     | Lấy chi tiết kết quả phân tích CV            | `cv_id` (path)                |

**Luồng `/cv/upload`:**
1. Validate file (chỉ nhận `.pdf`, `.docx`, `.doc`, `.txt`, max 10MB)
2. Parse ra text thuần (cv_parser)
3. Upload file gốc lên Supabase Storage
4. Gửi text đến Gemini AI → nhận kết quả phân tích JSON
5. Tạo embedding vector từ kỹ năng cốt lõi
6. Trích xuất skills & lưu vào DB
7. Vector search tìm job phù hợp → tạo notification

### 💼 Jobs Module (`/api/v1/jobs`)

| Method | Endpoint       | Mô tả                                         | Input                            |
| ------ | -------------- | ---------------------------------------------- | -------------------------------- |
| `POST` | `/jobs/create` | Nhà tuyển dụng đăng tin mới                    | JSON body (`JobCreateRequest`)   |
| `POST` | `/jobs/apply`  | Ứng viên nộp đơn (AI Match Score tự động)      | `job_id`, `user_id`, `cv_id` (query) |

### 🎤 Interview Module (`/api/v1/interview`)

| Method      | Endpoint                      | Mô tả                                        | Input                              |
| ----------- | ----------------------------- | --------------------------------------------- | ---------------------------------- |
| `POST`      | `/interview/start`            | Tạo phiên phỏng vấn mới                      | JSON body (`StartInterviewRequest`)|
| `WebSocket` | `/interview/ws/{session_id}`  | Kết nối phỏng vấn realtime                    | WebSocket connection               |
| `POST`      | `/interview/stt/convert`      | Chuyển file ghi âm → text (Speech-to-Text)    | `file` (form, audio/m4a)          |
| `GET`       | `/interview/history/{user_id}`| Lấy lịch sử tất cả phiên phỏng vấn           | `user_id` (path)                  |

### ❤️ Health Check

| Method | Endpoint   | Mô tả           |
| ------ | ---------- | ---------------- |
| `GET`  | `/health`  | Kiểm tra server  |

---

## 🗄 Database Schema (Supabase)

Các bảng chính cần có trong Supabase PostgreSQL (cần bật extension `pgvector`):

| Bảng                   | Mô tả                                          | Cột quan trọng                                             |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `user_profiles`        | Thông tin người dùng                            | `id`, `full_name`, `role`, `avatar_url`                    |
| `user_cvs`             | CV đã upload & phân tích                        | `user_id`, `file_url`, `parsed_data`, `embedding` (vector) |
| `skills`               | Master list kỹ năng                             | `id`, `name`, `category`                                   |
| `user_skills`          | Kỹ năng của từng user                           | `user_id`, `skill_id`, `proficiency_level`                 |
| `job_posts`            | Tin tuyển dụng                                  | `employer_id`, `title`, `description`, `embedding` (vector)|
| `applications`         | Đơn ứng tuyển                                   | `job_id`, `user_id`, `cv_id`, `ai_match_score`             |
| `interview_sessions`   | Phiên phỏng vấn                                 | `user_id`, `job_id`, `status`, `overall_score`             |
| `interview_messages`   | Tin nhắn trong phỏng vấn                         | `session_id`, `sender` (ai/user), `content`                |
| `notifications`        | Thông báo hệ thống                               | `user_id`, `title`, `content`, `data` (JSON)               |

**RPC Functions cần tạo** (cho Vector Search):
- `match_jobs(query_embedding, match_threshold, match_count)` — Tìm job phù hợp với CV
- `match_candidates(query_embedding, match_threshold, match_count)` — Tìm ứng viên phù hợp với Job

---

## 🔄 Luồng hoạt động chính

### 1. Ứng viên upload CV
```
App → POST /cv/upload → Parse PDF/DOCX → Gemini AI phân tích
    → Tạo embedding → Lưu Supabase → Vector search jobs
    → Gửi notification nếu có job phù hợp (≥75% match)
```

### 2. Nhà tuyển dụng đăng tin
```
App → POST /jobs/create → Tạo embedding cho Job
    → Lưu Supabase → [Background] Vector search ứng viên
    → Gửi notification cho ứng viên phù hợp (≥75% match)
```

### 3. Ứng viên ứng tuyển
```
App → POST /jobs/apply → Lấy CV + Job data
    → Gemini AI chấm Match Score → Lưu application
    → Notification cho cả 2 bên
```

### 4. Phỏng vấn AI Realtime
```
App → POST /interview/start → Nhận session_id
    → Kết nối WebSocket /interview/ws/{session_id}
    → AI đọc CV → Hỏi câu đầu tiên
    → Vòng lặp: User trả lời ↔ AI hỏi tiếp (tối đa 15 câu)
    → Khi kết thúc: AI đánh giá overall/technical/communication scores
    → Lưu kết quả vào DB
```

---

## ⚠️ Những chỗ BẠN CẦN THAY ĐỔI khi clone project

### 🔴 BẮT BUỘC THAY ĐỔI

#### 1. File `backend_ai_service/.env`

```env
# THAY tất cả giá trị bên dưới bằng credentials của BẠN:
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co        # ← THAY
SUPABASE_SERVICE_KEY=your_service_role_key_here          # ← THAY
GEMINI_API_KEY=your_gemini_api_key_here                  # ← THAY
DEEPSEEK_API_kEY=your_deepseek_key_or_leave_empty       # ← THAY (tuỳ chọn)
```

#### 2. File `frontend_new/.env`

```env
# THAY tất cả giá trị bên dưới:
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co    # ← THAY
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here                # ← THAY
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000/api/v1            # ← THAY
```

#### 3. Tạo database tables và RPC functions trên Supabase
- Tạo tất cả tables theo [Database Schema](#-database-schema-supabase) ở trên
- Bật extension `pgvector` (SQL: `CREATE EXTENSION IF NOT EXISTS vector;`)
- Tạo các cột `embedding` có type `vector(768)`
- Tạo 2 RPC functions: `match_jobs` và `match_candidates`

### 🟡 TUỲ CHỌN THAY ĐỔI

#### 4. File `backend_ai_service/app/core/config.py` (dòng 16-23)

```python
# Đổi model AI nếu muốn (ảnh hưởng chất lượng & tốc độ):
GEMINI_MODEL = "gemini-3.1-flash-lite-preview"   # ← Đổi nếu muốn model khác
EMBEDDING_MODEL = "gemini-embedding-001"          # ← Đổi model embedding

# Đổi model DeepSeek fallback:
DEEPSEEK_MODEL = "deepseek-chat"                  # ← Đổi nếu cần
```

#### 5. File `frontend_new/app.json` (nếu đổi tên/icon app)

```json
{
  "expo": {
    "name": "cvision",           // ← Đổi tên app hiển thị
    "slug": "cvision",           // ← Đổi slug
    "scheme": "louisjob",        // ← Đổi deep link scheme
    "icon": "./assets/images/icon.png",  // ← Đổi icon
    "splash": {
      "image": "./assets/images/splash-icon.png"  // ← Đổi splash
    }
  }
}
```

#### 6. File `backend_ai_service/app/core/config.py` — Tinh chỉnh thông số

```python
VECTOR_DIM = 768              # Số chiều vector (khớp với model embedding)
MIN_MATCH_SCORE = 0.7         # Ngưỡng tối thiểu để match job/ứng viên
MAX_MATCH_COUNT = 20          # Số kết quả tối đa trả về khi vector search
MAX_FILE_SIZE = 10 * 1024 * 1024  # Giới hạn file upload (10MB)
```

---

## ❓ FAQ & Troubleshooting

### Q: Backend khởi động nhưng lỗi "Supabase connection failed"
**A:** Kiểm tra `SUPABASE_URL` và `SUPABASE_SERVICE_KEY` trong `.env`. Đảm bảo dùng đúng **Service Role Key** cho backend.

### Q: App mobile không kết nối được với Backend
**A:** Kiểm tra:
1. `EXPO_PUBLIC_API_URL` phải trỏ đúng **IP LAN** của máy chạy backend (không phải `localhost` khi dùng điện thoại thật)
2. Cùng mạng WiFi
3. Backend đang chạy và lắng nghe trên `0.0.0.0:8000`
4. Firewall không chặn port 8000

### Q: Gemini API trả lỗi 429 (Rate Limit)
**A:** Hệ thống sẽ tự động fallback sang **DeepSeek AI**. Nếu muốn tránh, hãy nâng cấp Gemini API plan hoặc giảm tần suất gọi.

### Q: Embedding lỗi, vector search không hoạt động
**A:** Hệ thống có fallback sang model local **all-MiniLM-L6-v2** (384 chiều, tự động pad lên 768). Đảm bảo đã cài `sentence-transformers` trong requirements.

### Q: WebSocket phỏng vấn bị ngắt kết nối
**A:** Server đã tắt `ws_ping_interval` và `ws_ping_timeout`. Nếu vẫn bị ngắt, kiểm tra kết nối mạng và timeout của proxy (nếu có).

### Q: Chạy trên Windows bị lỗi `source` command
**A:** Dùng `.venv\Scripts\activate` (CMD) hoặc `.venv\Scripts\Activate.ps1` (PowerShell) thay vì `source`.

---

## 📝 Tóm tắt nhanh — Chạy project trong 5 phút

```bash
# Terminal 1: Backend
cd backend_ai_service
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt
# Tạo file .env → điền key Supabase + Gemini
python run.py

# Terminal 2: Frontend
cd frontend_new
npm install
# Tạo file .env → điền key Supabase + API URL
npx expo start -c
# Scan QR code bằng Expo Go hoặc nhấn 'a' cho Android Emulator
```

---

## 🤝 Đóng góp

Dự án ứng dụng AI mạnh mẽ trong việc giải quyết vấn đề nhân sự, đặc biệt hữu ích cho ứng viên cần tối ưu hóa hồ sơ và luyện tập kỹ năng phỏng vấn.

Mọi đóng góp qua **Pull Request** hoặc báo cáo lỗi qua **Issues** đều được khuyến khích!

---

<p align="center">Made with ❤️ by CVision Team</p>
