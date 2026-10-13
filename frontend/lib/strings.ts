// All user-facing text lives here (UI is Vietnamese).

export const strings = {
  appName: "FileMana",
  signIn: {
    title: "Đăng nhập",
    subtitle: "Dùng tài khoản được cấp cho bạn.",
    email: "Email",
    password: "Mật khẩu",
    remember: "Ghi nhớ đăng nhập",
    submit: "Đăng nhập",
    submitting: "Đang đăng nhập…",
  },
  signOut: "Đăng xuất",
  home: {
    greeting: (name: string) => `Xin chào, ${name}`,
  },
  gateError: {
    title: "Không tải được trang",
    retry: "Thử lại",
  },
} as const;

// Maps the API's stable error `code` (see CLAUDE.md, API Contract) to Vietnamese text.
const errorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  VALIDATION_FAILED: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  TOO_MANY_REQUESTS: "Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy nội dung này.",
  NETWORK: "Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.",
  INTERNAL_ERROR: "Có lỗi xảy ra. Vui lòng thử lại.",
};

export function errorMessage(code: string | undefined): string {
  return errorMessages[code ?? ""] ?? errorMessages.INTERNAL_ERROR;
}
