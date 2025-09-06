import React, { useEffect, useState } from "react";
import { useUser } from "./UserContext";
import Modal from "react-modal";
import { ref, get, update, remove } from "firebase/database";
import { db } from "./firebase";
import { useTranslation } from "react-i18next";
import { getDatabase, ref as dbRef, push } from "firebase/database";
import { logUserAction } from "./userLog";

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
  const { user } = useUser();
  const areaKeyMapping = {
    "Ngọc Thành": "NgocThanh",
    "Chí Thành": "ChiThanh",
    "Duy Hinh": "DuyHinh",
    Muội: "Muoi",
  };

  const getAreaKey = (areaName) =>
    areaKeyMapping[areaName] ||
    areaName.replace(/\s+/g, "").replace(/\//g, "_");
  const { t } = useTranslation();
  const mappedAreaKey = getAreaKey(areaKey);
  // Group UI state
  const [ui, setUI] = useState({
    employees: {},
    editEmployeeId: null,
    editEmployeeData: {},
    filterModel: "",
    filterDate: selectedDate || "",
    showOnlyLeave: false,
  });

  // Reset filter & edit state when modal open/close or selectedDate changes
  useEffect(() => {
    if (isOpen) {
      setUI((prev) => ({
        ...prev,
        filterModel: "",
        filterDate: selectedDate || "",
        showOnlyLeave: false,
        editEmployeeId: null,
        editEmployeeData: {},
      }));
    }
    if (!isOpen) {
      setUI((prev) => ({
        ...prev,
        employees: {},
        editEmployeeId: null,
        editEmployeeData: {},
      }));
    }
  }, [isOpen, selectedDate]);
  const dateKey = selectedDate?.replace(/-/g, "") || "";
  const filterDateKey = filterDate.replace(/-/g, "");

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!mappedAreaKey || !filterDateKey) {
        setUI((prev) => ({ ...prev, employees: {} }));
        return;
      }
      const snapshot = await get(ref(db, `attendance/${mappedAreaKey}`));
      if (!snapshot.exists()) {
        setUI((prev) => ({ ...prev, employees: {} }));
        return;
      }
      const rawData = snapshot.val();
      const result = {};
      Object.entries(rawData).forEach(([employeeId, emp]) => {
        const scheduleArr = Array.isArray(emp.schedules?.[filterDateKey])
          ? emp.schedules[filterDateKey]
          : emp.schedules?.[filterDateKey]
          ? [emp.schedules[filterDateKey]]
          : [];
        if (scheduleArr.length > 0) {
          result[employeeId] = {
            employeeId,
            name: formatName(emp.name || ""),
            imageUrl: emp.imageUrl || "",
            schedules: emp.schedules || {},
            shifts: scheduleArr,
          };
        }
      });
      setUI((prev) => ({ ...prev, employees: result }));
    };
    fetchAttendanceData();
  }, [mappedAreaKey, filterDateKey]);

  const handleChange = (field, value) => {
    if (field === "name") {
      value = formatName(value);
    }
    setUI((prev) => {
      const prevEdit = prev.editEmployeeData;
      let nextEdit;
      if (field === "status" && value === "Nghỉ phép") {
        nextEdit = {
          ...prevEdit,
          status: value,
          model: "--",
          startTime: "",
          endTime: "",
        };
      } else if (field === "status" && value === "Đi làm" && prevEdit.model === "--") {
        nextEdit = {
          ...prevEdit,
          status: value,
          model: "",
        };
      } else {
        nextEdit = { ...prevEdit, [field]: value };
      }
      return { ...prev, editEmployeeData: nextEdit };
    });
  };

  const handleCancelEdit = () => {
    setUI((prev) => ({
      ...prev,
      editEmployeeId: null,
      editEmployeeData: {},
    }));
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm(`Xóa nhân viên ${ui.employees[employeeId]?.name}?`)) return;
    try {
      await remove(ref(db, `attendance/${mappedAreaKey}/${employeeId}`));
      if (user) {
        await logUserAction(user.email, "delete_employee", `Xóa nhân viên: ${employeeId}`);
      }
      setUI((prev) => {
        const newEmployees = { ...prev.employees };
        delete newEmployees[employeeId];
        return { ...prev, employees: newEmployees };
      });
      if (ui.editEmployeeId === employeeId) handleCancelEdit();
    } catch (err) {
      console.error("Xóa thất bại:", err);
    }
  };

  const handleSaveEdit = async () => {
    const updated = { ...ui.editEmployeeData };
    const employeeId = ui.editEmployeeId;
    const timePhanCong = `${updated.startTime || ""} - ${updated.endTime || ""}`;
    const prevSchedules = ui.employees[employeeId]?.schedules || {};
    const prevShifts = Array.isArray(prevSchedules[dateKey])
      ? prevSchedules[dateKey]
      : prevSchedules[dateKey]
      ? [prevSchedules[dateKey]]
      : [];
    const newShift = {
      model: updated.model,
      joinDate: updated.joinDate || selectedDate,
      status: updated.status || "Đi làm",
      timePhanCong,
    };
    const newShiftsArr = [...prevShifts, newShift];
    await update(ref(db, `attendance/${mappedAreaKey}/${employeeId}`), {
      name: updated.name,
      imageUrl: updated.imageUrl,
      schedules: {
        ...prevSchedules,
        [dateKey]: newShiftsArr,
      },
    });
    if (user) {
      await logUserAction(user.email, "edit_shift", `Sửa ca: ${employeeId}, ${timePhanCong}`);
    }
    setUI((prev) => ({
      ...prev,
      employees: {
        ...prev.employees,
        [employeeId]: {
          ...updated,
          schedules: {
            ...prev.employees[employeeId]?.schedules,
            [dateKey]: newShiftsArr,
          },
          shifts: newShiftsArr,
        },
      },
    }));
    handleCancelEdit();
  };

  const groupedEmployees = {};
  modelList.forEach((model) => (groupedEmployees[model] = []));
  groupedEmployees["Nghỉ phép"] = [];

  Object.entries(ui.employees).forEach(([id, emp]) => {
    (emp.shifts || []).forEach((shift, idx) => {
      if (ui.showOnlyLeave && shift.status !== "Nghỉ phép") return;
      if (ui.filterModel && shift.model !== ui.filterModel) return;
      if (shift.status === "Nghỉ phép")
        groupedEmployees["Nghỉ phép"].push({
          id,
          ...emp,
          shift,
          shiftIdx: idx,
        });
      else
        groupedEmployees[shift.model || "Không xác định"]?.push({
          id,
          ...emp,
          shift,
          shiftIdx: idx,
        });
    });
  });
  // 📌 Thống kê toàn bộ trước khi lọc
  const totalCount = Object.keys(ui.employees).length;
  const countWorking = Object.values(ui.employees).filter(
    (emp) => emp.status === "Đi làm"
  ).length;
  const countLeave = Object.values(ui.employees).filter(
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
          {t("attendanceModal.close")}
        </button>
      </div>
      <h3 className="text-2xl font-bold mb-4">
        👥 {t("attendanceModal.leader")}: {mappedAreaKey} : {selectedDate}
      </h3>
      <h2 className="text-xl font-bold mb-2 bg-yellow-100 rounded px-3 py-2">
        {t("attendanceModal.total")}: {totalCount}{" "}
        {t("attendanceModal.totalPeople", { count: totalCount })} | 👷‍♂️{" "}
        {t("attendanceModal.working")}: {countWorking} | 🌴{" "}
        {t("attendanceModal.onLeave")}: {countLeave}
      </h2>
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <select
          value={ui.filterModel}
          onChange={(e) => setUI((prev) => ({ ...prev, filterModel: e.target.value }))}
          className="border px-3 py-1 rounded"
        >
          <option value="">{t("attendanceModal.allLines")}</option>
          {modelList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={ui.filterDate}
          onChange={(e) => setUI((prev) => ({ ...prev, filterDate: e.target.value }))}
          className="border px-3 py-1 rounded"
        />
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={ui.showOnlyLeave}
            onChange={(e) => setUI((prev) => ({ ...prev, showOnlyLeave: e.target.checked }))}
          />{" "}
          {t("attendanceModal.filterLeaveOnly")}
        </label>
        <button
          onClick={() => setUI((prev) => ({ ...prev, filterModel: "", filterDate: selectedDate || "", showOnlyLeave: false }))}
          className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
        >
          {t("attendanceModal.clearFilters")}
        </button>
      </div>

      {Object.entries(groupedEmployees).map(
        ([model, emps]) =>
          emps.length > 0 && (
            <div key={model} className="mb-6">
              <div className="bg-blue-100 text-blue-800 font-bold px-3 py-2 rounded mb-1">
                {t("attendanceModal.line")}: {model} —{" "}
                {t("attendanceModal.total")}: {emps.length} người | 👷‍♂️{" "}
                {t("attendanceModal.working")}:{" "}
                {emps.filter((e) => e.status === "Đi làm").length} | 🌴{" "}
                {t("attendanceModal.onLeave")}:{" "}
                {emps.filter((e) => e.status === "Nghỉ phép").length}
              </div>
              <table className="min-w-full border table-fixed text-sm">
                <thead>
                  <tr className="bg-gray-100 font-semibold text-center">
                    <th className="border px-2 py-1 w-[70px]">
                      {t("attendanceModal.avatar")}
                    </th>
                    <th className="border px-2 py-1 w-[210px]">
                      {t("attendanceModal.name")}
                    </th>
                    <th className="border px-2 py-1 w-[160px]">
                      {t("attendanceModal.employeeId")}
                    </th>
                    <th className="border px-2 py-1 w-[180px]">
                      {t("attendanceModal.timeAssigned")}
                    </th>
                    <th className="border px-2 py-1 w-[100px]">
                      {t("attendanceModal.status")}
                    </th>
                    <th className="border px-2 py-1 w-[170px]">
                      {t("attendanceModal.lineAssigned")}
                    </th>
                    <th className="border px-2 py-1 w-[170px]">
                      {t("attendanceModal.assignedDate")}
                    </th>
                    <th className="border px-2 py-1 w-[170px]">
                      {t("attendanceModal.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {emps.map(({ id, shift, shiftIdx, ...emp }) => {
                    const isEditing =
                      ui.editEmployeeId === id &&
                      ui.editEmployeeData.shiftIdx === shiftIdx;
                    return (
                      <tr
                        key={id + "-" + shiftIdx}
                        className="border-b text-center"
                      >
                        <td className="border px-2 py-1">
                          <img
                            src={emp.imageUrl || "/picture/employees/user.jpg"}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover mx-auto"
                          />
                        </td>
                        <td className="border px-2 py-1">{emp.name}</td>
                        <td className="border px-2 py-1">
                          {emp.employeeId || "—"}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <div className="flex justify-center items-center gap-1">
                              <input
                                type="time"
                                value={ui.editEmployeeData.startTime || ""}
                                onChange={(e) => setUI((prev) => ({ ...prev, editEmployeeData: { ...prev.editEmployeeData, startTime: e.target.value } }))}
                                className="border px-1 py-0.5 w-[80px]"
                                lang="vi"
                              />
                              <span>-</span>
                              <input
                                type="time"
                                value={ui.editEmployeeData.endTime || ""}
                                onChange={(e) => setUI((prev) => ({ ...prev, editEmployeeData: { ...prev.editEmployeeData, endTime: e.target.value } }))}
                                className="border px-1 py-0.5 w-[80px]"
                                lang="vi"
                              />
                            </div>
                          ) : (
                            shift.timePhanCong || "—"
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <select
                              value={ui.editEmployeeData.status || ""}
                              onChange={(e) => setUI((prev) => ({ ...prev, editEmployeeData: { ...prev.editEmployeeData, status: e.target.value } }))}
                              className="w-full border px-1 py-0.5"
                            >
                              <option value="Đi làm">
                                {t("attendanceModal.workingStatus")}
                              </option>
                              <option value="Nghỉ phép">
                                {t("attendanceModal.leaveStatus")}
                              </option>
                            </select>
                          ) : shift.status === "Nghỉ phép" ? (
                            t("attendanceModal.leaveStatus")
                          ) : (
                            t("attendanceModal.workingStatus")
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <select
                              value={ui.editEmployeeData.model || ""}
                              onChange={(e) => setUI((prev) => ({ ...prev, editEmployeeData: { ...prev.editEmployeeData, model: e.target.value } }))}
                              className="w-full border px-1 py-0.5"
                              disabled={ui.editEmployeeData.status === "Nghỉ phép"}
                            >
                              <option value="">
                                {t("attendanceModal.selectLine")}
                              </option>
                              {modelList.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          ) : shift.status === "Nghỉ phép" ? (
                            "--"
                          ) : (
                            shift.model || "—"
                          )}
                        </td>
                        <td className="border px-2 py-1">
                          {isEditing ? (
                            <input
                              type="date"
                              value={ui.editEmployeeData.joinDate || ""}
                              onChange={(e) => setUI((prev) => ({ ...prev, editEmployeeData: { ...prev.editEmployeeData, joinDate: e.target.value } }))}
                              className="border px-1 py-0.5 w-full"
                            />
                          ) : (
                            shift.joinDate || "—"
                          )}
                        </td>
                        <td className="border px-2 py-1 space-x-1">
                          {user ? (
                            isEditing ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-2 py-1 bg-green-500 text-white rounded"
                                >
                                  {t("attendanceModal.save")}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-2 py-1 bg-gray-400 text-white rounded"
                                >
                                  {t("attendanceModal.cancel")}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setUI((prev) => ({
                                    ...prev,
                                    editEmployeeId: id,
                                    editEmployeeData: {
                                      ...emp,
                                      ...shift,
                                      shiftIdx,
                                      startTime: (shift.timePhanCong || "").split(" - ")[0] || "",
                                      endTime: (shift.timePhanCong || "").split(" - ")[1] || "",
                                    },
                                  }))}
                                  className="px-2 py-1 bg-blue-600 text-white rounded"
                                >
                                  {t("attendanceModal.edit")}
                                </button>
                                <button
                                  onClick={() => handleDelete(id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded"
                                >
                                  {t("attendanceModal.delete")}
                                </button>
                              </>
                            )
                          ) : null}
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
