import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role?: string;
}


interface AuthState {
  /** User object đã xác thực. null nếu chưa đăng nhập. */
  user: User | null;
  /** Session object hiện tại. null nếu chưa đăng nhập. */
  session: Session | null;
  /**
   * true khi đang resolve trạng thái auth lần đầu tiên.
   * Dùng để tránh hiển thị UI trước khi biết user là ai.
   */
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  profile: Profile | null;  // Thêm thông tin profile chi tiết
  isAuthenticated: boolean;   // Check nhanh đã login chưa
  /** Đăng xuất và xóa session. */
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;  // Hàm để load lại profile khi user đổi avatar/tên
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * AuthProvider phải được bọc ở root layout (`app/_layout.tsx`).
 *
 * Chiến lược 2 bước:
 * 1. `getSession()` — Đọc ngay từ local storage (không cần network),
 *    cho phép render UI trước khi network request hoàn tất.
 * 2. `getUser()`   — Gọi server để xác thực lại token, đảm bảo
 *    session không bị giả mạo hoặc hết hạn phía server.
 * 3. `onAuthStateChange` — Lắng nghe mọi thay đổi (login, logout,
 *    token refresh) và cập nhật state tự động.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const refreshProfile = async (userId: string) => {
    if (!userId) return;
    const { data, error } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (!error && data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // ── Bước 1: Lấy session từ local storage ngay lập tức ──
      const { data: { session: localSession } } = await supabase.auth.getSession();

      if (mounted) {
        // Cập nhật UI ngay với dữ liệu từ local storage
        setSession(localSession);
        setUser(localSession?.user ?? null);
        if (session?.user) await refreshProfile(session.user.id);  // Lấy Profile ngay.
        setLoading(false);
      }

      // ── Bước 2: Xác thực lại với server (background) ──
      // getUser() verify JWT với Supabase server — không block UI
      if (localSession) {
        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();
        if (mounted && !error) {
          setUser(verifiedUser);
        }
      }
    };

    init();

    // ── Bước 3: Lắng nghe thay đổi auth realtime ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) await refreshProfile(newSession.user.id);
          else setProfile(null);
          // Đảm bảo loading luôn tắt sau event đầu tiên
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, profile, isAuthenticated: !!user, refreshProfile: () => user ? refreshProfile(user.id) : Promise.resolve() }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook tiêu thụ AuthContext.
 *
 * @example
 * const { user, session, loading, signOut } = useAuth();
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth() phải được dùng bên trong <AuthProvider>');
  }
  return context;
}
