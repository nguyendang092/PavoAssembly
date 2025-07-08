import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { ref, get, update, remove } from "firebase/database";
import { db } from "./firebase";

const formatName = (name) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // bỏ thừa khoảng trắng
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

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
    Muội: "Muoi",
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

      const snapshot = await get(ref(db, `attendance/${mappedAreaKey}`));
      if (!snapshot.exists()) {
        setEmployees({});
        return;
      }

      const rawData = snapshot.val();
      const result = {};

      Object.entries(rawData).forEach(([employeeId, emp]) => {
        const matchedScheduleEntry = Object.entries(emp.schedules || {}).find(
          ([scheduleDateKey]) => scheduleDateKey === filterDateKey
        );

        if (matchedScheduleEntry) {
          const [scheduleDateKey, schedule] = matchedScheduleEntry;
          result[employeeId] = {
            employeeId,
            name: formatName(emp.name || ""),
            imageUrl: emp.imageUrl || "",
            status: schedule.status || "Đi làm",
            model: schedule.model || "",
            joinDate: schedule.joinDate || "",
            timePhanCong: schedule.timePhanCong || "",
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
    const emp = employees[id];
    const [start, end] = (emp.timePhanCong || "").split(" - ");
    setEditEmployeeId(id);
    setEditEmployeeData({
      ...emp,
      startTime: start || "",
      endTime: end || "",
    });
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleChange = (field, value) => {
    if (field === "name") {
      value = formatName(value);
    }
    setEditEmployeeData((prev) => {
      if (field === "status" && value === "Nghỉ phép") {
        return { ...prev, status: value, model: "" };
      }
      return { ...prev, [field]: value };
    });
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

  const handleCancelEdit = () => {
    setEditEmployeeId(null);
    setEditEmployeeData({});
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm(`Xóa nhân viên ${employees[employeeId]?.name}?`))
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
      console.error("Xóa thất bại:", err);
    }
  };

  const handleSaveEdit = async () => {
    const updated = { ...editEmployeeData };
    const employeeId = editEmployeeId;
    const timePhanCong = `${updated.startTime || ""} - ${
      updated.endTime || ""
    }`;

    await update(ref(db, `attendance/${mappedAreaKey}/${employeeId}`), {
      name: updated.name,
      imageUrl: updated.imageUrl,
      schedules: {
        ...(employees[employeeId]?.schedules || {}),
        [dateKey]: {
          model: updated.model,
          joinDate: updated.joinDate || selectedDate,
          status: updated.status || "Đi làm",
          timePhanCong,
        },
      },
    });

    setEmployees((prev) => ({
      ...prev,
      [employeeId]: {
        ...updated,
        timePhanCong,
        schedules: {
          ...(prev[employeeId]?.schedules || {}),
          [dateKey]: {
            model: updated.model,
            joinDate: updated.joinDate || selectedDate,
            status: updated.status || "Đi làm",
            timePhanCong,
          },
        },
      },
    }));

    handleCancelEdit();
  };

  const groupedEmployees = {};
  modelList.forEach((model) => (groupedEmployees[model] = []));
  groupedEmployees["Nghỉ phép"] = [];

  Object.entries(employees).forEach(([id, emp]) => {
    if (showOnlyLeave && emp.status !== "Nghỉ phép") return;
    if (filterModel && emp.model !== filterModel) return;
    if (emp.status === "Nghỉ phép")
      groupedEmployees["Nghỉ phép"].push({ id, ...emp });
    else groupedEmployees[emp.model || "Không xác định"]?.push({ id, ...emp });
  });
  // 📌 Thống kê toàn bộ trước khi lọc
  const totalCount = Object.keys(employees).length;
  const countWorking = Object.values(employees).filter(
    (emp) => emp.status === "Đi làm"
  ).length;
  const countLeave = Object.values(employees).filter(
    (emp) => emp.status === "Nghỉ phép"
  ).length;
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="relative bg-white rounded-lg p-6 max-w-6xl mx-auto mt-16 mb-16 shadow  max-h-[90vh] overflow-y-auto"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
    >
      <div className="text-right mt-2">
        <button
          onClick={onClose}
          className="absolute right-2 px-4 py-2 bg-gray-500 text-white rounded z-50 font-bold"
        >
          Đóng
        </button>
      </div>
      <h3 className="text-2xl font-bold mb-4">
        👥 Leader: {mappedAreaKey} : {selectedDate}
      </h3>
      <h2 className="text-xl font-bold mb-2 bg-yellow-100 rounded px-3 py-2">
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
          />{" "}
          DSNV nghỉ phép
        </label>
        <button
          onClick={() => {
            setFilterModel("");
            setFilterDate(selectedDate || "");
            setShowOnlyLeave(false);
          }}
          className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
        >
          Xóa bộ lọc
        </button>
      </div>

      {Object.entries(groupedEmployees).map(
        ([model, emps]) =>
          emps.length > 0 && (
            <div key={model} className="mb-6">
              <div className="bg-blue-100 text-blue-800 font-bold px-3 py-2 rounded mb-1">
                * Line: {model} — Tổng: {emps.length} người | 👷‍♂️ Đi làm:{" "}
                {emps.filter((e) => e.status === "Đi làm").length} | 🌴 Nghỉ
                phép: {emps.filter((e) => e.status === "Nghỉ phép").length}
              </div>
              <table className="min-w-full border table-fixed text-sm">
                <thead>
                  <tr className="bg-gray-100 font-semibold text-center">
                    <th className="border px-2 py-1 w-[70px]">Ảnh</th>
                    <th className="border px-2 py-1 w-[210px]">Họ & Tên</th>
                    <th className="border px-2 py-1 w-[160px]">Mã NV</th>
                    <th className="border px-2 py-1 w-[180px]">
                      Thời gian phân line
                    </th>
                    <th className="border px-2 py-1 w-[100px]">Trạng thái</th>
                    <th className="border px-2 py-1 w-[170px]">Line</th>
                    <th className="border px-2 py-1 w-[170px]">
                      Ngày phân công
                    </th>
                    <th className="border px-2 py-1 w-[170px]">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {emps.map(({ id, ...emp }) => {
                    const isEditing = editEmployeeId === id;
                    return (
                      <tr key={id} className="border-b text-center">
                        <td className="border px-2 py-1">
                          <img
                            src={emp.imageUrl || "/picture/employees/user.jpg"}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover mx-auto"
                          />
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <input
                              value={editEmployeeData.name || ""}
                              onChange={(e) =>
                                handleChange("name", formatName(e.target.value))
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
                            <div className="flex justify-center items-center gap-1">
                              <input
                                type="time"
                                value={editEmployeeData.startTime || ""}
                                onChange={(e) =>
                                  handleChange("startTime", e.target.value)
                                }
                                className="border px-1 py-0.5 w-[80px]"
                                lang="vi"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={editEmployeeData.endTime || ""}
                                onChange={(e) =>
                                  handleChange("endTime", e.target.value)
                                }
                                className="border px-1 py-0.5 w-[80px]"
                                lang="vi"
                              />
                            </div>
                          ) : (
                            emp.timePhanCong || "—"
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
                </tbody>
              </table>
            </div>
          )
      )}
    </Modal>
  );
};

export default AttendanceModal;
