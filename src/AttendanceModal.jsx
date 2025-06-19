import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { ref, remove, update } from "firebase/database";
import { db } from "./firebase";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import imageCompression from "browser-image-compression";

const AttendanceModal = ({
  isOpen,
  onClose,
  selectedDate,
  attendanceData = {},
  timeSlots = [],
  areaKey,
  modelList = [],
  weekKey,
}) => {
  const [employees, setEmployees] = useState({});
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [editEmployeeData, setEditEmployeeData] = useState({});
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  const [filterModel, setFilterModel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    setEmployees(attendanceData || {});
  }, [attendanceData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) return;
    try {
      await remove(ref(db, `attendance/${areaKey}/${weekKey}/${id}`));
      setEmployees((prev) => {
        const newEmp = { ...prev };
        delete newEmp[id];
        return newEmp;
      });
    } catch (error) {
      console.error("Xóa nhân viên lỗi:", error);
    }
  };

  const handleEditClick = (id) => {
    setEditEmployeeId(id);
    setEditEmployeeData(employees[id] || {});
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleChange = (field, value) => {
    setEditEmployeeData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const cropToSquare = async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        );
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type);
      };
    });
  };

  const uploadImageToStorage = async (file, employeeId) => {
    const squareFile = await cropToSquare(file);
    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 512,
      useWebWorker: true,
    };
    const compressedFile = await imageCompression(squareFile, options);
    const storage = getStorage();
    const storageReference = storageRef(storage, `employees/${employeeId}.jpg`);
    await uploadBytes(storageReference, compressedFile);
    const downloadURL = await getDownloadURL(storageReference);
    return downloadURL;
  };

  const handleSaveEdit = async () => {
    try {
      let updatedData = { ...editEmployeeData };
      if (editImageFile) {
        const imageUrl = await uploadImageToStorage(
          editImageFile,
          editEmployeeData.employeeId || "unknown"
        );
        updatedData.imageUrl = imageUrl;
      }
      await update(
        ref(db, `attendance/${areaKey}/${weekKey}/${editEmployeeId}`),
        updatedData
      );
      setEmployees((prev) => ({
        ...prev,
        [editEmployeeId]: updatedData,
      }));
      setEditEmployeeId(null);
      setEditEmployeeData({});
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch (error) {
      console.error("Cập nhật nhân viên lỗi:", error);
      alert("Có lỗi xảy ra khi cập nhật.");
    }
  };

  const handleCancelEdit = () => {
    setEditEmployeeId(null);
    setEditEmployeeData({});
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const groupedEmployees = modelList.reduce((acc, model) => {
    acc[model] = [];
    return acc;
  }, {});

  Object.entries(employees).forEach(([id, emp]) => {
    const model = emp.model || "Không xác định";
    if (!groupedEmployees[model]) groupedEmployees[model] = [];
    groupedEmployees[model].push({ id, ...emp });
  });

  const filteredGroupedEmployees = {};
  Object.entries(groupedEmployees).forEach(([model, emps]) => {
    if (filterModel && model !== filterModel) return;
    const filtered = filterStatus
      ? emps.filter((e) => e.status === filterStatus)
      : emps;
    if (filtered.length > 0) filteredGroupedEmployees[model] = filtered;
  });

  const totalEmployees = Object.values(filteredGroupedEmployees).reduce(
    (acc, emps) => acc + emps.length,
    0
  );

  const totalStatusCount = {
    "Đi làm": 0,
    "Nghỉ phép": 0,
  };

  Object.values(filteredGroupedEmployees).forEach((emps) => {
    emps.forEach((emp) => {
      if (emp.status === "Đi làm") totalStatusCount["Đi làm"]++;
      else if (emp.status === "Nghỉ phép") totalStatusCount["Nghỉ phép"]++;
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Attendance Modal"
      className="bg-white p-6 rounded shadow-lg w-full max-w-5xl mx-auto mt-12"
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50"
    >
      <h2 className="text-xl font-bold mb-4">
        🧑‍🤝‍🧑 Danh sách nhân viên {selectedDate} – Tổng: {totalEmployees} người |
        👷‍♂️ Đi làm: {totalStatusCount["Đi làm"]} |
        🌴 Nghỉ phép: {totalStatusCount["Nghỉ phép"]}
      </h2>

      {/* Bộ lọc */}
      <div className="flex space-x-4 mb-4">
        <select
          className="border px-3 py-2 rounded"
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
        >
          <option value="">-- Lọc theo line --</option>
          {modelList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          className="border px-3 py-2 rounded"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">-- Lọc theo trạng thái --</option>
          <option value="Đi làm">Đi làm</option>
          <option value="Nghỉ phép">Nghỉ phép</option>
        </select>

        <button
          onClick={() => {
            setFilterModel("");
            setFilterStatus("");
          }}
          className="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Xóa bộ lọc
        </button>
      </div>

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="min-w-full border text-sm text-left">
          <thead>
            <tr className="bg-gray-100 font-semibold text-center">
              <th className="border px-2 py-1" colSpan={9}>Danh sách nhân viên</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(filteredGroupedEmployees).map(([model, emps]) => {
              const lineStats = {
                "Đi làm": emps.filter((e) => e.status === "Đi làm").length,
                "Nghỉ phép": emps.filter((e) => e.status === "Nghỉ phép").length,
              };

              return (
                <React.Fragment key={model}>
                  {/* Tên line + thống kê */}
                  <tr className="bg-blue-100 font-bold text-left">
                    <td colSpan={9} className="px-2 py-1">
                      * Line:  {model} ({emps.length} người) – 👷‍♂️ {lineStats["Đi làm"]} đi làm | 🌴 {lineStats["Nghỉ phép"]} nghỉ phép
                    </td>
                  </tr>

                  {/* Tiêu đề cột */}
                  <tr className="bg-gray-200 font-semibold text-center">
                    <th className="border px-2 py-1">Ảnh</th>
                    <th className="border px-2 py-1">Tên</th>
                    <th className="border px-2 py-1">Mã NV</th>
                    <th className="border px-2 py-1">Năm sinh</th>
                    <th className="border px-2 py-1">SĐT</th>
                    <th className="border px-2 py-1">Trạng thái</th>
                    <th className="border px-2 py-1">Line</th>
                    <th className="border px-2 py-1">Ngày phân công</th>
                    <th className="border px-2 py-1">Hành động</th>
                  </tr>

                  {/* Danh sách nhân viên */}
                  {emps.map(({ id, ...emp }) => {
                    const isEditing = editEmployeeId === id;
                    return (
                      <tr key={id} className="border-b text-center">
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <>
                              <img
                                src={
                                  editImagePreview ||
                                  emp.imageUrl ||
                                  "https://via.placeholder.com/48"
                                }
                                alt="avatar"
                                className="w-10 h-10 rounded-full object-cover mx-auto mb-1"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleEditImageChange}
                                className="w-full"
                              />
                            </>
                          ) : (
                            <img
                              src={emp.imageUrl || "https://via.placeholder.com/48"}
                              alt="avatar"
                              className="w-10 h-10 rounded-full object-cover mx-auto"
                            />
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <input
                              value={editEmployeeData.name || ""}
                              onChange={(e) => handleChange("name", e.target.value)}
                              className="w-full border px-1 py-0.5"
                            />
                          ) : (
                            emp.name
                          )}
                        </td>
                        <td className="border px-2 py-1">{emp.employeeId || "—"}</td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editEmployeeData.birthYear || ""}
                              onChange={(e) => handleChange("birthYear", e.target.value)}
                              className="w-full border px-1 py-0.5"
                            />
                          ) : (
                            emp.birthYear || "—"
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <input
                              value={editEmployeeData.phone || ""}
                              onChange={(e) => handleChange("phone", e.target.value)}
                              className="w-full border px-1 py-0.5"
                            />
                          ) : (
                            emp.phone
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <select
                              value={editEmployeeData.status || ""}
                              onChange={(e) => handleChange("status", e.target.value)}
                              className="w-full border px-1 py-0.5"
                            >
                              <option value="Đi làm">Đi làm</option>
                              <option value="Nghỉ phép">Nghỉ phép</option>
                            </select>
                          ) : (
                            emp.status
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <select
                              value={editEmployeeData.model || ""}
                              onChange={(e) => handleChange("model", e.target.value)}
                              className="w-full border px-1 py-0.5"
                            >
                              <option value="">-- Chọn line --</option>
                              {modelList.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          ) : (
                            emp.model || "—"
                          )}
                        </td>
                        <td className="border px-2 py-1">{emp.joinDate || "—"}</td>
                        <td className="border px-2 py-1 space-x-1">
                          {isEditing ? (
                            <>
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
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-right mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
};

export default AttendanceModal;
