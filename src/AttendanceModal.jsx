import React, { useEffect, useState } from "react";
import { ref, onValue, set, remove, update } from "firebase/database";
import { db } from "./firebase";

const AttendanceModal = ({
  isOpen,
  onClose,
  selectedDate,
  attendanceData,
  timeSlots,
  areaKey,
  modelList,
}) => {
  const [employees, setEmployees] = useState({});
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [editEmployeeData, setEditEmployeeData] = useState({
    name: "",
    position: "",
    phone: "",
    area: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    const empRef = ref(db, `employees/${areaKey}`);
    return onValue(empRef, (snapshot) => {
      setEmployees(snapshot.val() || {});
    });
  }, [isOpen, areaKey]);

  const handleEditClick = (id) => {
    const emp = employees[id];
    setEditEmployeeId(id);
    setEditEmployeeData({
      name: emp.name,
      position: emp.position,
      phone: emp.phone,
      area: emp.area || "",
    });
  };

  const handleCancelEdit = () => {
    setEditEmployeeId(null);
    setEditEmployeeData({ name: "", position: "", phone: "", area: "" });
  };

  const handleSaveEdit = () => {
    if (!editEmployeeId) return;
    const empRef = ref(db, `employees/${areaKey}/${editEmployeeId}`);
    update(empRef, editEmployeeData)
      .then(() => {
        setEditEmployeeId(null);
      })
      .catch(() => alert("Lỗi cập nhật nhân viên!"));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa nhân viên này?")) return;
    const empRef = ref(db, `employees/${areaKey}/${id}`);
    remove(empRef).catch(() => alert("Lỗi xóa nhân viên!"));
  };

  const handleChange = (field, value) => {
    setEditEmployeeData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    isOpen && (
      <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
        <div className="relative p-6 bg-white w-full max-w-3xl m-auto rounded-lg">
          <h2 className="text-xl font-bold mb-4">
            Danh sách nhân viên ngày {selectedDate}
          </h2>

          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-2 py-1">Tên</th>
                <th className="border px-2 py-1">Chức vụ</th>
                <th className="border px-2 py-1">Số điện thoại</th>
                <th className="border px-2 py-1">Line làm việc</th>
                <th className="border px-2 py-1">Ngày đi làm hiện tại</th>
                <th className="border px-2 py-1">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(employees)
                .filter(([_, emp]) => emp.joinDate === selectedDate)
                .map(([id, emp]) => (
                  <tr key={id} className="border-b">
                    {editEmployeeId === id ? (
                      <>
                        <td className="border px-2 py-1">
                          <input
                            value={editEmployeeData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            className="w-full border px-1 py-0.5"
                          />
                        </td>
                        <td className="border px-2 py-1">
                          <input
                            value={editEmployeeData.position}
                            onChange={(e) => handleChange("position", e.target.value)}
                            className="w-full border px-1 py-0.5"
                          />
                        </td>
                        <td className="border px-2 py-1">
                          <input
                            value={editEmployeeData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            className="w-full border px-1 py-0.5"
                          />
                        </td>
                        <td className="border px-2 py-1">
                          <select
                            value={editEmployeeData.area}
                            onChange={(e) => handleChange("area", e.target.value)}
                            className="w-full border px-1 py-0.5"
                          >
                            <option value="">-- Chọn line --</option>
                            {modelList.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border px-2 py-1" colSpan={2}>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-2 py-1 bg-green-500 text-white rounded"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-gray-400 text-white rounded"
                            >
                              Hủy
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border px-2 py-1">{emp.name}</td>
                        <td className="border px-2 py-1">{emp.position}</td>
                        <td className="border px-2 py-1">{emp.phone}</td>
                        <td className="border px-2 py-1">{emp.area || "—"}</td>
                        <td className="border px-2 py-1">{emp.joinDate}</td>
                        <td className="border px-2 py-1 space-x-2">
                          <button
                            onClick={() => handleEditClick(id)}
                            className="px-2 py-1 bg-blue-600 text-white rounded"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(id)}
                            className="px-2 py-1 bg-red-600 text-white rounded"
                          >
                            Xóa
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="mt-4 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default AttendanceModal; 