# CVision - Hệ thống AI Hỗ trợ Tìm việc & Phỏng vấn (Job Match AI System)

CVision là một nền tảng hỗ trợ sinh viên và người đi tìm việc thông minh, tích hợp trí tuệ nhân tạo (AI). Dự án bao gồm hai thành phần chính: một backend service được xây dựng bằng Python (FastAPI) kết hợp sức mạnh của Google Gemini AI, và một ứng dụng di động frontend được xây dựng bằng React Native (Expo).

## 🚀 Cấu trúc dự án

Dự án được chia thành 2 thư mục chính:

1. **`backend_ai_service`** - Backend API & AI Models
2. **`frontend_new`** - Ứng dụng di động (Mobile App Frontend)

---

## 🏗️ 1. Backend AI Service (`backend_ai_service`)

Backend chịu trách nhiệm xử lý các tác vụ xử lý ngôn ngữ tự nhiên, phân tích CV, tìm kiếm công việc phù hợp và tạo các buổi phỏng vấn giả lập (mock interview).

### 🛠 Công nghệ sử dụng:

- **FastAPI**: Xây dựng API tốc độ cao.
- **Supabase & pgvector**: Quản lý cơ sở dữ liệu và lưu trữ vector cho tìm kiếm ngữ nghĩa.
- **Google Generative AI (Gemini)**: Trí tuệ nhân tạo cốt lõi để phân tích nội dung, đối thoại và chấm điểm CV.
- **pypdf & python-docx**: Xử lý và trích xuất văn bản từ hồ sơ của ứng viên.
- **WebSockets**: Hỗ trợ giao tiếp thời gian thực, có thể dùng cho tính năng phỏng vấn AI.

### 🌐 Các API chính (Prefix: `/api/v1`):

- `/cv`: Upload, phân tích và trích xuất dữ liệu từ CV (PDF/Docx).
- `/jobs`: Hệ thống đề xuất (recommendation) công việc dựa trên năng lực từ CV.
- `/interview`: Hệ thống phỏng vấn giả lập thông minh do AI điều phối.

### ⚙️ Hướng dẫn cài đặt Backend:

1. Di chuyển vào thư mục backend:
   ```bash
   cd backend_ai_service
   ```
2. Tạo môi trường ảo (khuyến nghị) và cài đặt thư viện:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # (Với Windows: .venv\Scripts\activate)
   pip install -r requirements.txt
   ```
3. Cấu hình file `.env` chứa các API key của **Supabase** và **Gemini**.
4. Chạy server:
   ```bash
   python run.py
   # hoặc
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 📱 2. Frontend Application (`frontend_new`)

Đây là một ứng dụng di động đa nền tảng sử dụng framework Expo Router, mang đến giao diện mượt mà và hiện đại cho người dùng khi tương tác với hệ thống AI.

### 🛠 Công nghệ sử dụng:

- **React Native & Expo Router**: Xây dựng UI và điều hướng ứng dụng một cách hiện đại.
- **@supabase/supabase-js**: Giao tiếp trực tiếp với cơ sở dữ liệu Supabase.
- **Axios**: Gửi HTTP request đến `backend_ai_service`.
- **UI & Icons**: `lucide-react-native`, `phosphor-react-native`, `react-native-reanimated`.
- **Hỗ trợ Dark/Light Theme**, quản lý state (Async Storage) và xử lý hình ảnh/file (Expo Document Picker, Image Picker).

### ⚙️ Hướng dẫn cài đặt Frontend:

1. Di chuyển vào thư mục frontend:
   ```bash
   cd frontend_new
   ```
2. Cài đặt các Node dependencies:
   ```bash
   npm install
   ```
3. Cấu hình kết nối tới Backend và Supabase thông qua file `.env`.
4. Khởi chạy ứng dụng:
   ```bash
   npx expo start
   ```
   _Nhấn `a` để mở trên Android Emulator, hoặc `i` cho iOS Simulator._

---

## 🤝 Thành viên & Quy trình đóng góp

Dự án được ứng dụng AI mạnh mẽ trong việc giải quyết vấn đề nhân sự, đặc biệt hữu ích cho ứng viên đang cần tối ưu hóa hồ sơ và luyện tập kỹ năng phỏng vấn.
Mọi đóng góp từ cộng đồng (qua Pull Request) hoặc báo cáo lỗi (Issues) đều được khuyến khích!
