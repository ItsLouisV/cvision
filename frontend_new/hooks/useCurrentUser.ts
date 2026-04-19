/**
 * useCurrentUser — Backward-compatible wrapper cho useAuth().
 *
 * Các component đang dùng `useCurrentUser()` không cần thay đổi gì.
 * Auth state thực sự được quản lý bởi AuthContext (Provider pattern).
 *
 * @example
 * const { user, loading } = useCurrentUser();
 */
export { useAuth as useCurrentUser } from '@/contexts/AuthContext';
