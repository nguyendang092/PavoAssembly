import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { logUserAction } from "./userLog";

export default function SignIn({ onSignIn, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!email || !password) {
        setError("Vui lòng nhập email và mật khẩu.");
        setLoading(false);
        return;
      }
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Lấy displayName nếu có, nếu không lấy email
      const name = user.displayName || user.email;
      // Ghi log đăng nhập thành công
      await logUserAction(user.email, "login", "Đăng nhập thành công");
      if (onSignIn) onSignIn({ email: user.email, name });
      if (onClose) onClose();
    } catch (err) {
      setError("Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMsg("");
    setError("");
    if (!email) {
      setError("Vui lòng nhập email để đặt lại mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setResetMsg("Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
    } catch (err) {
      setError("Không gửi được email đặt lại mật khẩu. Vui lòng kiểm tra lại email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
          aria-label="Đóng"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Đăng nhập</h2>
        {!showReset ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mật khẩu</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <div className="text-right mt-2">
              <button
                type="button"
                className="text-blue-600 text-xs hover:underline"
                onClick={() => { setShowReset(true); setError(""); setResetMsg(""); }}
              >
                Quên mật khẩu?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nhập email để đặt lại mật khẩu</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {resetMsg && <div className="text-green-600 text-sm">{resetMsg}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? "Đang gửi..." : "Gửi email đặt lại mật khẩu"}
            </button>
            <div className="text-right mt-2">
              <button
                type="button"
                className="text-blue-600 text-xs hover:underline"
                onClick={() => { setShowReset(false); setError(""); setResetMsg(""); }}
              >
                Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/*
HƯỚNG DẪN SỬ DỤNG logUserAction CHO FILE KHÁC:

import { logUserAction } from "./SignIn";

// Ví dụ ghi log khi thêm nhân viên:
await logUserAction(currentUser.email, "add_employee", `Thêm nhân viên: ${employeeName}`);

// Ví dụ ghi log khi xóa ca làm việc:
await logUserAction(currentUser.email, "delete_shift", `Xóa ca: ${shiftId}`);

// Có thể dùng cho bất kỳ hành động nào cần ghi lại lịch sử hoạt động của user.
*/
