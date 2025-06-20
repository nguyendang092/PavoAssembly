// src/AddAssignmentModal.js
import React, { useState } from "react";
import Modal from "react-modal";
import { ref, push } from "firebase/database";
import { db } from "./firebase";

const AddAssignmentModal = ({ isOpen, onClose, onSuccess }) => {
  const [area, setArea] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!area.trim()) return;

    try {
      await push(ref(db, "assignments"), { area });
      onSuccess?.(`Đã thêm khu vực: ${area}`);
      setArea("");
      onClose();
    } catch (error) {
      alert("Lỗi khi thêm khu vực.");
      console.error(error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white p-6 rounded shadow-lg w-full max-w-md mx-auto mt-24"
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50"
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
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Nhập tên khu vực..."
        />
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Lưu
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAssignmentModal;
