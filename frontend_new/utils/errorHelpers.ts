export const mapSupabaseError = (errorMsg: string): string => {
    if (errorMsg.includes('User already registered')) return 'Email này đã có chủ rồi! Thử email khác nhé.';
    if (errorMsg.includes('Invalid login credentials')) return 'Email hoặc mật khẩu chưa đúng kìa, kiểm tra lại nhé.';
    if (errorMsg.includes('Email not confirmed')) return 'Hãy check hòm thư và xác thực tài khoản trước đã.';
    if (errorMsg.includes('Password should be at least 6 characters')) return 'Mật khẩu phải từ 6 ký tự trở lên cho bảo mật nhé.';
    if (errorMsg.includes('Network request failed')) return 'Mạng có vấn đề rồi, kiểm tra wifi/4G xem sao.';
    
    return "Ối, có lỗi nhỏ: " + errorMsg; // Lỗi mặc định nếu không khớp cái nào
};