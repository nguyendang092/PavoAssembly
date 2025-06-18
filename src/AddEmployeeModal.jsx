import React, { useState } from "react";
import Modal from "react-modal";
import { ref, push } from "firebase/database";
import { db } from "./firebase";

const modelList = [
  "SILICON REAR 46-55",
  "LEAK TEST REAR",
  "LEAK TEST FRONT",
  "METAL DECO 46-55",
  "GLASS 46-55",
  "MTC FRONT 46-55",
  "KM24",
];

const AddEmployeeModal = ({ isOpen, onClose, areaKey = "default_area" }) => {
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    phone: "",
    joinDate: "",
    model: "",
  });

  const handleAddEmployee = () => {
    const { name, position, phone, joinDate, model } = newEmployee;

    if (!name.trim() || !joinDate) {
      alert("Vui lòng nhập tên và ngày vào làm");
      return;
    }

    const newEmpRef = ref(db, `employees/${areaKey}`);
    push(newEmpRef, { name, position, phone, joinDate, model })
      .then(() => {
        setNewEmployee({
          name: "",
          position: "",
          phone: "",
          joinDate: "",
          model: "",
        });
        onClose();
      })
      .catch(() => alert("Lỗi khi thêm nhân viên"));
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Thêm nhân viên"
      className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto mt-24 p-8 animate-fade-in outline-none"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">
        ➕ Thêm nhân viên mới
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tên */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Tên</label>
          <input
            type="text"
            placeholder="Nguyễn Văn A"
            value={newEmployee.name}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
        </div>

        {/* Chức vụ */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Chức vụ</label>
          <input
            type="text"
            placeholder="Công nhân"
            value={newEmployee.position}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, position: e.target.value }))
            }
            className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
        </div>

        {/* SĐT */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Số điện thoại</label>
          <input
            type="text"
            placeholder="0123456789"
            value={newEmployee.phone}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, phone: e.target.value }))
            }
            className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
        </div>

        {/* Ngày vào làm */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Ngày vào làm</label>
          <input
            type="date"
            value={newEmployee.joinDate}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, joinDate: e.target.value }))
            }
            className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
        </div>

        {/* Khu vực */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 font-medium mb-1">Khu vực làm việc</label>
          <select
            value={newEmployee.model}
            onChange={(e) =>
              setNewEmployee((prev) => ({ ...prev, model: e.target.value }))
            }
            className="w-full border border-gray-300 px-4 py-2 rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-green-400 focus:outline-none"
          >
            <option value="">-- Chọn khu vực --</option>
            {modelList.map((model, idx) => (
              <option key={idx} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Button */}
      <div className="flex justify-end mt-6 space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition duration-200"
        >
          Hủy
        </button>
        <button
          onClick={handleAddEmployee}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200"
        >
          Lưu
        </button>
      </div>
    </Modal>
  );
};

export default AddEmployeeModal;
