import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { ref, get, update, remove } from "firebase/database";
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
  areaKey,
  modelList = [],
}) => {
  const areaKeyMapping = {
    "Ngọc Thành": "NgocThanh",
    "Chí Thành": "ChiThanh",
    "Duy Hinh": "DuyHinh",
    "Muội": "Muoi",
  };

  const getAreaKey = (areaName) =>
    areaKeyMapping[areaName] ||
    areaName.replace(/\s+/g, "").replace(/\//g, "_");

  const mappedAreaKey = getAreaKey(areaKey);

  const [employees, setEmployees] = useState({});
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [editEmployeeData, setEditEmployeeData] = useState({});
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [filterModel, setFilterModel] = useState("");
  const [filterDate, setFilterDate] = useState(selectedDate || "");
  const [showOnlyLeave, setShowOnlyLeave] = useState(false);
  const dateKey = selectedDate?.replace(/-/g, "") || "";
  const filterDateKey = filterDate.replace(/-/g, "");

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!mappedAreaKey || !filterDateKey) {
        setEmployees({});
        return;
      }

      // console.log("▶️ mappedAreaKey:", mappedAreaKey);
      // console.log("▶️ filterDate:", filterDate);
      // console.log("▶️ filterDateKey:", filterDateKey);

      const snapshot = await get(ref(db, `attendance/${mappedAreaKey}`));
      // console.log("📂 Đọc đường dẫn:", `attendance/${mappedAreaKey}`);

      if (!snapshot.exists()) {
        // console.log("❌ Không tìm thấy dữ liệu.");
        setEmployees({});
        return;
      }

      const rawData = snapshot.val();
      // console.log("✅ rawData:", rawData);

      const result = {};

      Object.entries(rawData).forEach(([employeeId, emp]) => {
        const matchedScheduleEntry = Object.entries(emp.schedules || {}).find(
          ([scheduleDateKey]) => scheduleDateKey === filterDateKey
        );

        // console.log(`🔍 EmployeeId: ${employeeId}`, matchedScheduleEntry);

        if (matchedScheduleEntry) {
          const [scheduleDateKey, schedule] = matchedScheduleEntry;
          result[employeeId] = {
            employeeId,
            name: emp.name || "",
            birthYear: emp.birthYear || "",
            phone: emp.phone || "",
            imageUrl: emp.imageUrl || "",
            status: schedule.status || "Đi làm",
            model: schedule.model || "",
            joinDate: schedule.joinDate || filterDate,
            schedules: emp.schedules || {},
            _scheduleDateKey: scheduleDateKey,
          };
        }
      });

      setEmployees(result);
    };

    fetchAttendanceData();
  }, [mappedAreaKey, filterDateKey]);

  const handleEditClick = (id) => {
    setEditEmployeeId(id);
    setEditEmployeeData(employees[id]);
    setEditImagePreview(null);
    setEditImageFile(null);
  };

  const handleChange = (field, value) => {
    setEditEmployeeData((prev) => {
      if (field === "status" && value === "Nghỉ phép") {
        // Nếu chọn nghỉ phép thì reset line về rỗng
        return { ...prev, status: value, model: "" };
      }
      return { ...prev, [field]: value };
    });
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
    const compressedFile = await imageCompression(squareFile, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 512,
      useWebWorker: true,
    });

    const storage = getStorage();
    const storageReference = storageRef(storage, `employees/${employeeId}.jpg`);
    await uploadBytes(storageReference, compressedFile);
    return await getDownloadURL(storageReference);
  };

  const handleCancelEdit = () => {
    setEditEmployeeId(null);
    setEditEmployeeData({});
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleDelete = async (employeeId) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa toàn bộ dữ liệu của nhân viên ${
          employees[employeeId]?.name || ""
        }?`
      )
    )
      return;
    try {
      await remove(ref(db, `attendance/${mappedAreaKey}/${employeeId}`));
      setEmployees((prev) => {
        const newEmployees = { ...prev };
        delete newEmployees[employeeId];
        return newEmployees;
      });
      if (editEmployeeId === employeeId) handleCancelEdit();
    } catch (err) {
      console.error("Lỗi khi xóa nhân viên:", err);
      alert("Xóa nhân viên thất bại.");
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updated = { ...editEmployeeData };
      const employeeId = editEmployeeId;

      if (editImageFile) {
        const imageUrl = await uploadImageToStorage(editImageFile, employeeId);
        updated.imageUrl = imageUrl;
      }

      await update(ref(db, `attendance/${mappedAreaKey}/${employeeId}`), {
        name: updated.name,
        birthYear: updated.birthYear,
        phone: updated.phone,
        imageUrl: updated.imageUrl,
        schedules: {
          ...(employees[employeeId]?.schedules || {}),
          [dateKey]: {
            model: updated.model,
            joinDate: updated.joinDate || selectedDate,
            status: updated.status || "Đi làm",
          },
        },
      });

      setEmployees((prev) => ({
        ...prev,
        [employeeId]: {
          ...updated,
          schedules: {
            ...(prev[employeeId]?.schedules || {}),
            [dateKey]: {
              model: updated.model,
              joinDate: updated.joinDate || selectedDate,
              status: updated.status || "Đi làm",
            },
          },
        },
      }));

      handleCancelEdit();
    } catch (err) {
      console.error("Lỗi cập nhật:", err);
      alert("Lỗi khi lưu thay đổi.");
    }
  };

  const filteredEmployees = Object.entries(employees)
    .filter(([_, emp]) => (showOnlyLeave ? emp.status === "Nghỉ phép" : true))
    .filter(([_, emp]) => !filterModel || emp.model === filterModel);
  // Tính thống kê
  const totalCount = filteredEmployees.length;
  const countWorking = filteredEmployees.filter(
    ([_, emp]) => emp.status === "Đi làm"
  ).length;
  const countLeave = filteredEmployees.filter(
    ([_, emp]) => emp.status === "Nghỉ phép"
  ).length;
  const groupedEmployees = {};
  modelList.forEach((model) => {
    groupedEmployees[model] = [];
  });
  groupedEmployees["Nghỉ phép"] = [];

  Object.entries(employees).forEach(([id, emp]) => {
    if (emp.status === "Nghỉ phép") {
      groupedEmployees["Nghỉ phép"].push({ id, ...emp });
    } else {
      const model = emp.model || "Không xác định";
      if (!groupedEmployees[model]) groupedEmployees[model] = [];
      groupedEmployees[model].push({ id, ...emp });
    }
  });

  // Áp dụng filter cho từng nhóm theo model
  const filteredGroupedEmployees = {};

  Object.entries(groupedEmployees).forEach(([model, emps]) => {
    if (filterModel && model !== filterModel) return;

    let filtered = emps;

    if (showOnlyLeave) {
      filtered = filtered.filter((e) => e.status === "Nghỉ phép");
    }

    if (filtered.length > 0) filteredGroupedEmployees[model] = filtered;
  });

  // Tính tổng nhân viên sau filter để thống kê tổng
  const totalEmployees = Object.values(filteredGroupedEmployees).reduce(
    (acc, emps) => acc + emps.length,
    0
  );

  // Thống kê tổng số Đi làm / Nghỉ phép
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
      contentLabel="Attendance"
      className="bg-white rounded-lg p-6 max-w-6xl mx-auto mt-16 shadow"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
    >
      <h3 className="text-2xl font-bold mb-4">
        {" "}
        👥 Leader: {mappedAreaKey} : {selectedDate}
      </h3>
      <h2 className="text-xl font-bold mb-4">
        Tổng: {totalCount} người | 👷‍♂️ Đi làm: {countWorking} | 🌴 Nghỉ phép:{" "}
        {countLeave}
      </h2>
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="border px-3 py-1 rounded"
        >
          <option value="">-- Tất cả line --</option>
          {modelList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border px-3 py-1 rounded"
        />

        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showOnlyLeave}
            onChange={(e) => setShowOnlyLeave(e.target.checked)}
          />
          DSNV nghỉ phép
        </label>

        <button
          onClick={() => {
            setFilterModel("");
            setFilterStatus("");
            setFilterDate(selectedDate || "");
            setShowOnlyLeave(false);
          }}
          className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
        >
          Xóa bộ lọc
        </button>
      </div>

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto text-sm">
        <table className="min-w-full border table-fixed">
          <thead>
            <tr className="bg-gray-100 font-semibold text-center">
              <th className="border px-2 py-1" colSpan={9}>
                Danh sách nhân viên
              </th>
            </tr>
          </thead>
          <thead>
            <tr className="bg-gray-100 font-semibold text-center">
              <th className="border px-2 py-1 w-[80px]">Ảnh</th>
              <th className="border px-2 py-1 w-[160px]">Họ & Tên</th>
              <th className="border px-2 py-1 w-[100px]">Mã NV</th>
              <th className="border px-2 py-1 w-[100px]">Năm sinh</th>
              <th className="border px-2 py-1 w-[120px]">SĐT</th>
              <th className="border px-2 py-1 w-[120px]">Trạng thái</th>
              <th className="border px-2 py-1 w-[140px]">Line</th>
              <th className="border px-2 py-1 w-[140px]">Ngày phân công</th>
              <th className="border px-2 py-1 w-[150px]">Hành động</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(filteredGroupedEmployees).length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center py-6 text-gray-500 italic"
                >
                  Chưa có nhân viên được phân công
                </td>
              </tr>
            ) : (
              Object.entries(filteredGroupedEmployees).map(([model, emps]) => (
                <React.Fragment key={model}>
                  {/* Tên line + thống kê */}
                  <tr className="bg-blue-100 font-bold text-left">
                    <td colSpan={9} className="px-2 py-1">
                      * Line: {model} — Tổng: {emps.length} người | 👷‍♂️ Đi làm:{" "}
                      {emps.filter((e) => e.status === "Đi làm").length} | 🌴
                      Nghỉ phép:{" "}
                      {emps.filter((e) => e.status === "Nghỉ phép").length}
                    </td>
                  </tr>

                  {/* Danh sách nhân viên */}
                  {emps.map(({ id, ...emp }) => {
                    const isEditing = editEmployeeId === id;
                    return (
                      <tr key={id} className="border-b text-center">
                        {/* Cột ảnh */}
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
                              src={
                                emp.imageUrl || "https://via.placeholder.com/48"
                              }
                              alt="avatar"
                              className="w-10 h-10 rounded-full object-cover mx-auto"
                            />
                          )}
                        </td>

                        {/* Các cột còn lại giống như bạn đã có */}
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <input
                              value={editEmployeeData.name || ""}
                              onChange={(e) =>
                                handleChange("name", e.target.value)
                              }
                              className="w-full border px-1 py-0.5"
                            />
                          ) : (
                            emp.name
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {emp.employeeId || "—"}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editEmployeeData.birthYear || ""}
                              onChange={(e) =>
                                handleChange("birthYear", e.target.value)
                              }
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
                              onChange={(e) =>
                                handleChange("phone", e.target.value)
                              }
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
                              onChange={(e) =>
                                handleChange("status", e.target.value)
                              }
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
                              onChange={(e) =>
                                handleChange("model", e.target.value)
                              }
                              className="w-full border px-1 py-0.5"
                              disabled={editEmployeeData.status === "Nghỉ phép"}
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
                        <td className="border px-2 py-1">
                          {emp.joinDate || "—"}
                        </td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-right mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
};

export default AttendanceModal;
