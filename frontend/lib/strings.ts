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
    theme: "Giao diện",
    themes: { light: "Sáng", dark: "Tối", system: "Theo hệ thống" },
  },
  settings: {
    profile: "Hồ sơ",
    avatar: "Ảnh đại diện",
    avatarHint: "JPG, PNG hoặc WebP, tối đa 2 MB.",
    changeAvatar: "Đổi ảnh",
    removeAvatar: "Gỡ ảnh",
    name: "Tên",
    jobTitle: "Chức danh",
    save: "Lưu",
    saving: "Đang lưu…",
    saved: "Đã lưu hồ sơ.",
    password: "Mật khẩu",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới",
    newPasswordHint: "Ít nhất 8 ký tự. Các thiết bị khác sẽ bị đăng xuất.",
    changePassword: "Đổi mật khẩu",
    passwordChanged: "Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.",
    sessions: "Phiên đăng nhập",
    sessionsHint: "Đăng xuất khỏi mọi thiết bị khác. Thiết bị này vẫn đăng nhập.",
    signOutOthers: "Đăng xuất mọi thiết bị khác",
    signedOutOthers: "Đã đăng xuất các thiết bị khác.",
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
  WRONG_PASSWORD: "Mật khẩu hiện tại không đúng.",
  INVALID_IMAGE: "Ảnh phải là JPG, PNG hoặc WebP.",
  FILE_TOO_LARGE: "Ảnh lớn quá, tối đa 2 MB.",
  INTERNAL_ERROR: "Có lỗi xảy ra. Vui lòng thử lại.",
};

export function errorMessage(code: string | undefined): string {
  return errorMessages[code ?? ""] ?? errorMessages.INTERNAL_ERROR;
}
