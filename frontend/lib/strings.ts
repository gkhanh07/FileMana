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
  nav: {
    label: "Điều hướng chính",
    home: "Trang chủ",
    myTasks: "Việc của tôi",
    inbox: "Hộp thư",
    projects: "Dự án",
    docs: "Tài liệu",
    settings: "Cài đặt",
    favorites: "Yêu thích",
    favoritesEmpty: "Ghim dự án để mở nhanh.",
    collapse: "Thu gọn thanh bên",
    expand: "Mở rộng thanh bên",
    account: "Tài khoản",
  },
  topbar: {
    breadcrumb: "Vị trí hiện tại",
    search: "Tìm việc, dự án, tài liệu, người…",
    create: "Tạo mới",
    notifications: "Thông báo",
    theme: "Giao diện",
    themes: { light: "Sáng", dark: "Tối", system: "Theo hệ thống" },
  },
  comingSoon: "Phần này đang được xây dựng.",
  offline: "Đang mất kết nối",
  notFound: {
    title: "Không tìm thấy trang",
    message: "Trang này không tồn tại hoặc đã bị chuyển đi.",
    home: "Về Trang chủ",
  },
  gateError: {
    title: "Không tải được trang",
    message: "Đã có lỗi khi tải trang này. Bạn thử lại nhé.",
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
