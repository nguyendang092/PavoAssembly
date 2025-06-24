import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, set } from "firebase/database";
import { get, ref as dbRef } from "firebase/database";
import { format, getWeek, getYear, startOfWeek, addDays } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Modal from "react-modal";
import ChartModal from "./ChartModal";
import AttendanceModal from "./AttendanceModal";
import AddEmployeeModal from "./AddEmployeeModal";
import { getAreaKey } from "./utils";

Modal.setAppElement("#root");

const timeLabels = [
  "08:00 - 10:00",
  "10:10 - 11:30",
  "12:30 - 15:00",
  "15:10 - 17:00",
  "17:30 - 20:00",
];

const AreaProductionTableTime = ({ area }) => {
  // Ví dụ sử dụng trong component:
  const areaKey = getAreaKey(area);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [actualData, setActualData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [productionData, setProductionData] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modelList, setModelList] = useState([]);
  const weekNumber = getWeek(selectedDate, { weekStartsOn: 1 });
  const year = getYear(selectedDate);
  const weekKey = `week_${year}_${weekNumber}`;
  const [modelEditOpen, setModelEditOpen] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const startDateOfWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const timeSlots = Array.from({ length: 6 }, (_, i) => {
    const date = addDays(startDateOfWeek, i);
    return {
      label: format(date, "EEEE"),
      date: format(date, "yyyy-MM-dd"),
      display: format(date, "MM/dd (EEEE)"),
      fullDate: date,
    };
  });

  useEffect(() => {
    const actualRef = ref(db, `actual/${areaKey}/${weekKey}`);
    const productionRef = ref(db, `production/${areaKey}/${weekKey}`);
    const attendanceRef = ref(db, `attendance/${areaKey}/${weekKey}`);

    const unsubActual = onValue(actualRef, (snapshot) => {
      setActualData(snapshot.val() || {});
    });

    const unsubProduction = onValue(productionRef, (snapshot) => {
      setProductionData(snapshot.val() || {});
    });

    const unsubAttendance = onValue(attendanceRef, (snapshot) => {
      setAttendanceData(snapshot.val() || {});
    });

    return () => {
      unsubActual();
      unsubProduction();
      unsubAttendance();
    };
  }, [areaKey, weekKey]);

  useEffect(() => {
    const fetchModelList = async () => {
      try {
        const snap = await get(dbRef(db, `assignments/${areaKey}`));
        if (snap.exists()) {
          const data = snap.val();
          setModelList(data.modelList || []);
        } else {
          console.warn("Không tìm thấy modelList cho", areaKey);
          setModelList([]);
        }
      } catch (error) {
        console.error("Lỗi khi lấy modelList:", error);
        setModelList([]);
      }
    };

    fetchModelList();
  }, [areaKey]);

  const handleDateChange = (e) => {
    setSelectedDate(new Date(e.target.value));
  };

  const changeWeek = (direction) => {
    setSelectedDate((prev) => {
      const currentStart = startOfWeek(prev, { weekStartsOn: 1 });
      return direction === "prev"
        ? addDays(currentStart, -7)
        : addDays(currentStart, 7);
    });
  };

  const handleDataChange = (type, model, slot, e) => {
    const val = e.target.value;
    // Chỉ cho phép nhập số hoặc để trống
    if (val === "" || /^[0-9]*$/.test(val)) {
      const numVal = val === "" ? 0 : Number(val);

      if (type === "actual") {
        setActualData((prev) => {
          const newData = { ...prev };
          if (!newData[model]) newData[model] = {};
          newData[model][slot] = numVal;
          return newData;
        });
      } else {
        setProductionData((prev) => {
          const newData = { ...prev };
          if (!newData[model]) newData[model] = {};
          newData[model][slot] = numVal;
          return newData;
        });
      }

      // Lưu dữ liệu vào Firebase
      const path = `${type}/${areaKey}/${weekKey}/${model}/${slot}`;
      set(ref(db, path), numVal).catch(() => {
        alert(`Lỗi cập nhật ${type === "actual" ? "thực tế" : "kế hoạch"}!`);
      });
    }
  };
  useEffect(() => {
    const fetchModelList = async () => {
      try {
        const snap = await get(dbRef(db, `assignments/${areaKey}`));
        if (snap.exists()) {
          const data = snap.val();
          setModelList(data.modelList || []);
        } else {
          console.warn("Không tìm thấy modelList cho", areaKey);
          setModelList([]);
        }
      } catch (error) {
        console.error("Lỗi khi lấy modelList:", error);
        setModelList([]);
      }
    };

    fetchModelList();
  }, [areaKey]);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [["Model", "Slot", "Kế hoạch", "Thực tế", "Tỉ lệ"]];
    modelList.forEach((model) => {
      timeLabels.forEach((slot) => {
        const plan = Number(productionData[model]?.[slot] ?? 0);
        const actual = Number(actualData[model]?.[slot] ?? 0);
        const ratio =
          plan > 0 ? ((actual / plan) * 100).toFixed(1) + "%" : "0.0%";
        wsData.push([model, slot, plan, actual, ratio]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Theo Giờ");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `SanLuongGio_${areaKey}_${weekKey}.xlsx`
    );
  };

  const chartData = {};
  modelList.forEach((model) => {
    chartData[model] = timeLabels.map((slot) => {
      const plan = Number(productionData[model]?.[slot] ?? 0);
      const actual = Number(actualData[model]?.[slot] ?? 0);
      const ratio = plan > 0 ? Number(((actual / plan) * 100).toFixed(1)) : 0;
      return {
        label: slot,
        plan,
        actual,
        ratio,
      };
    });
  });

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between mb-3 gap-2  ">
        <div>
          <button
            onClick={() => setModelEditOpen(true)}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
          >
            ⚙️ Quản lý Line
          </button>
          <button
            onClick={() => changeWeek("prev")}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← Tuần trước
          </button>
          <button
            onClick={() => changeWeek("next")}
            className="ml-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Tuần sau →
          </button>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setAttendanceModalOpen(true)}
            className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🧑‍🤝‍🧑 Nhân viên
          </button>
          <button
            onClick={() => setAddEmployeeModalOpen(true)}
            className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            ➕ Thêm phân công
          </button>
          <button
            onClick={() => setModalIsOpen(true)}
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📊 Biểu đồ
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            📥 Xuất Excel
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-600 italic font-semibold mb-2">
        Tuần {weekNumber} ({format(startDateOfWeek, "dd/MM/yyyy")} -{" "}
        {format(addDays(startDateOfWeek, 6), "dd/MM/yyyy")})
      </div>

      <div className="flex items-center justify-between mb-4">
        <label className="font-semibold text-gray-800">
          Chọn ngày :{" "}
          <input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={handleDateChange}
            className="border border-gray-300 rounded px-2 py-1 ml-2"
          />
        </label>
        <span className="text-sm text-gray-600 italic">
          Tuần : {weekNumber} ({weekKey})
        </span>
      </div>
      <table className="w-full border-collapse text-sm text-gray-700">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-3 py-2 text-left">
              Model
            </th>
            <th className="border border-gray-300 px-3 py-2 text-left">Loại</th>
            {timeLabels.map((slot) => (
              <th
                key={slot}
                className="border border-gray-300 px-2 py-2 text-center"
              >
                {slot}
              </th>
            ))}
            <th className="border border-gray-300 px-2 py-2 text-center">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {modelList.map((model) => {
            const totalPlan = timeLabels.reduce(
              (sum, slot) => sum + Number(productionData[model]?.[slot] ?? 0),
              0
            );
            const totalActual = timeLabels.reduce(
              (sum, slot) => sum + Number(actualData[model]?.[slot] ?? 0),
              0
            );
            const averageRatio =
              totalPlan > 0
                ? ((totalActual / totalPlan) * 100).toFixed(1)
                : "0.0";

            return (
              <React.Fragment key={model}>
                <tr className="bg-blue-50 hover:bg-blue-100">
                  <td
                    rowSpan={3}
                    className="border border-gray-300 px-3 py-2 font-semibold text-left text-blue-800"
                  >
                    {model}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 font-semibold text-blue-800">
                    Kế hoạch
                  </td>
                  {timeLabels.map((slot) => (
                    <td
                      key={slot}
                      className="border border-gray-300 px-2 py-1 text-center"
                    >
                      <input
                        type="text"
                        value={productionData[model]?.[slot] ?? ""}
                        onChange={(e) =>
                          handleDataChange("production", model, slot, e)
                        }
                        className="w-full text-center border border-blue-300 rounded px-1 py-0.5"
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold text-blue-800">
                    {totalPlan}
                  </td>
                </tr>
                <tr className="bg-green-50 hover:bg-green-100">
                  <td className="border border-gray-300 px-2 py-1 font-semibold text-green-800">
                    Thực tế
                  </td>
                  {timeLabels.map((slot) => (
                    <td
                      key={slot}
                      className="border border-gray-300 px-2 py-1 text-center"
                    >
                      <input
                        type="text"
                        value={actualData[model]?.[slot] ?? ""}
                        onChange={(e) =>
                          handleDataChange("actual", model, slot, e)
                        }
                        className="w-full text-center border border-green-300 rounded px-1 py-0.5"
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold text-green-800">
                    {totalActual}
                  </td>
                </tr>
                <tr className="bg-yellow-50 hover:bg-yellow-100">
  <td className="border border-gray-300 px-2 py-1 text-left font-semibold text-yellow-800">
    % Hoàn thành
  </td>
  {timeSlots.map((slotObj) => {
    const plan = Number(productionData[model]?.[slotObj.label] || 0);
    const actual = Number(actualData[model]?.[slotObj.label] || 0);
    const ratio =
      plan > 0 && !isNaN(actual)
        ? ((actual / plan) * 100).toFixed(1)
        : "0.0";
    return (
      <td
        key={slotObj.date}
        className="border border-gray-300 px-2 py-1 text-center font-semibold"
      >
        {ratio}%
      </td>
    );
  })}
  <td className="border border-gray-300 px-2 py-1 text-center font-semibold text-yellow-800">
    {averageRatio}%
  </td>
</tr>

              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <Modal
        isOpen={modelEditOpen}
        onRequestClose={() => setModelEditOpen(false)}
        className="bg-gradient-to-br from-blue-50 to-white p-6 max-w-md w-full mx-auto rounded-2xl shadow-2xl transform transition-all duration-300 scale-100"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 transition-opacity duration-300"
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">
          🛠 Quản lý Line
        </h2>

        <ul className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {modelList.map((model, index) => (
            <li key={index} className="flex items-center gap-2 group">
              <input
                value={model}
                onChange={(e) => {
                  const updated = [...modelList];
                  updated[index] = e.target.value;
                  setModelList(updated);
                }}
                className="border border-blue-300 px-3 py-2 flex-1 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-white group-hover:bg-blue-50"
              />
              <button
                onClick={() => {
                  const updated = modelList.filter((_, i) => i !== index);
                  setModelList(updated);
                }}
                className="text-red-500 hover:text-red-700 transition text-lg"
                title="Xóa model"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 mt-5">
          <input
            type="text"
            placeholder="Thêm Line mới"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            className="border border-green-300 px-3 py-2 flex-1 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-green-400 transition bg-white"
          />
          <button
            onClick={() => {
              const trimmed = newModelName.trim();
              if (trimmed !== "") {
                setModelList([...modelList, trimmed]);
                setNewModelName("");
              }
            }}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition font-semibold shadow-md"
          >
            ➕
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => setModelEditOpen(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition shadow-sm"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              set(ref(db, `assignments/${areaKey}/modelList`), modelList)
                .then(() => {
                  showToast("✅ Đã cập nhật Line");
                  setModelEditOpen(false);
                })
                .catch(() => {
                  showToast("❌ Lỗi khi lưu Line!");
                });
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold shadow-md"
          >
            💾 Lưu
          </button>
        </div>
      </Modal>

      {/* Biểu đồ */}
      <ChartModal
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
        weekNumber={weekNumber}
        chartData={chartData}
        modelList={modelList}
        area={area}
        selectedDate={format(selectedDate, "yyyy-MM-dd")}
      />

      {/* Modal nhân viên */}
      <AttendanceModal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        selectedDate={format(selectedDate, "yyyy-MM-dd")}
        attendanceData={attendanceData}
        timeSlots={timeSlots}
        areaKey={areaKey}
        modelList={modelList}
        weekKey={weekKey}
      />

      <AddEmployeeModal
        isOpen={addEmployeeModalOpen}
        onClose={() => setAddEmployeeModalOpen(false)}
        areaKey={areaKey}
        weekKey={weekKey}
        modelList={modelList}
        selectedDate={format(selectedDate, "yyyy-MM-dd")}
      />
    </div>
  );
};

export default AreaProductionTableTime;
