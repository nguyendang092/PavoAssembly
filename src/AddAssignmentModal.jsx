import React, { useState, useCallback } from "react";
import Modal from "react-modal";
import { ref, push } from "firebase/database";
import { db } from "./firebase";

const AddAssignmentModal = ({ isOpen, onClose, onSuccess }) => {
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isValid = area.trim().length >= 2;

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isValid || loading) return;

      setLoading(true);
      setErrorMsg("");
      try {
        await push(ref(db, "assignments"), { area: area.trim() });
        onSuccess?.(`Đã thêm khu vực: ${area.trim()}`);
        setArea("");
        onClose();
      } catch (error) {
        console.error(error);
        setErrorMsg("Lỗi khi thêm khu vực. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [area, isValid, loading, onClose, onSuccess]
  );

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={loading ? null : onClose} // không đóng khi đang loading
      className="bg-white p-6 rounded shadow-lg w-full max-w-md mx-auto mt-24"
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50"
      ariaHideApp={false}
    >
      <h2 className="text-xl font-bold mb-4">➕ Thêm khu vực mới</h2>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-medium text-gray-700">
          Tên khu vực / Leader:
        </label>
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-2"
          placeholder="Nhập tên khu vực..."
          disabled={loading}
          autoFocus
        />
        {errorMsg && (
          <p className="text-red-600 mb-2 text-sm font-medium">{errorMsg}</p>
        )}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 rounded text-white ${
              loading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gray-400 hover:bg-gray-500"
            }`}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!isValid || loading}
            className={`px-4 py-2 rounded text-white ${
              !isValid || loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAssignmentModal;
