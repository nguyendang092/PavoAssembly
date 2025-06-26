import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, set } from "firebase/database";
import { get, ref as dbRef } from "firebase/database";
import { format, getWeek, startOfWeek, addDays, getYear } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Modal from "react-modal";
import ChartModal from "./ChartModal";
import AttendanceModal from "./AttendanceModal";
import AddEmployeeModal from "./AddEmployeeModal";
import { getAreaKey } from "./utils";

Modal.setAppElement("#root");

const AreaProductionTable = ({ area, showToast }) => {
  const areaKey = getAreaKey(area);
  const [draftModelList, setDraftModelList] = useState([]);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [actualData, setActualData] = useState({});
  const [productionData, setProductionData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
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
    if (modelEditOpen) {
      setDraftModelList(modelList); // copy dữ liệu mỗi khi mở Modal
    }
  }, [modelEditOpen]);
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

  const handleActualChange = (model, slot, e) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*$/.test(val)) {
      const numericVal = val === "" ? 0 : Number(val);
      setActualData((prev) => {
        const newData = { ...prev };
        if (!newData[model]) newData[model] = {};
        newData[model][slot] = val;

        // Ghi vào actual (theo tuần)
        set(
          ref(db, `actual/${areaKey}/${weekKey}/${model}/${slot}`),
          numericVal
        ).catch(() => alert("Lỗi cập nhật thực tế!"));
        return newData;
      });
    }
  };

  const handleProductionChange = (model, slot, e) => {
    console.log(areaKey, weekKey, model, slot);
    const val = e.target.value;
    if (val === "" || /^[0-9]*$/.test(val)) {
      setProductionData((prev) => {
        const newData = { ...prev };
        if (!newData[model]) newData[model] = {};
        newData[model][slot] = val;
        set(
          ref(db, `production/${areaKey}/${weekKey}/${model}/${slot}`),
          val === "" ? 0 : Number(val)
        ).catch(() => alert("Lỗi cập nhật sản lượng!"));
        return newData;
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
    const wsData = [["Model", "Ngày", "Kế hoạch", "Thực tế", "Tỉ lệ"]];
    modelList.forEach((model) => {
      timeSlots.forEach((slotObj) => {
        const plan = productionData[model]?.[slotObj.label] || 0;
        const actual = actualData[model]?.[slotObj.label] || 0;
        const ratio =
          plan > 0 ? ((actual / plan) * 100).toFixed(1) + "%" : "0.0%";
        wsData.push([model, slotObj.display, plan, actual, ratio]);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Sản lượng");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `SanLuong_${areaKey}_${weekKey}.xlsx`
    );
  };

  // Biến chartData dùng cho ChartModal
  const chartData = {};
  modelList.forEach((model) => {
    chartData[model] = timeSlots.map((slotObj) => {
      const plan = Number(productionData[model]?.[slotObj.label] || 0);
      const actual = Number(actualData[model]?.[slotObj.label] || 0);
      const ratio = plan > 0 ? Number(((actual / plan) * 100).toFixed(1)) : 0;
      return {
        label: slotObj.display,
        plan,
        actual,
        ratio,
      };
    });
  });

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
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
          Tuần {weekNumber} - {weekNumber}주차
        </span>
      </div>

      <table className="w-full border-collapse text-sm text-gray-700">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-3 py-2 text-left">
              Model
            </th>
            <th className="border border-gray-300 px-3 py-2 text-left">Loại</th>
            {timeSlots.map((slotObj) => (
              <th
                key={slotObj.date}
                className="border border-gray-300 px-2 py-2 text-center"
              >
                {slotObj.display}
              </th>
            ))}
            <th className="border border-gray-300 px-2 py-2 text-center">
              Tổng
            </th>
          </tr>
        </thead>
        <tbody>
          {modelList.map((model) => {
            const totalPlan = timeSlots.reduce(
              (sum, slotObj) =>
                sum + Number(productionData[model]?.[slotObj.label] || 0),
              0
            );
            const totalActual = timeSlots.reduce(
              (sum, slotObj) =>
                sum + Number(actualData[model]?.[slotObj.label] || 0),
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
                    style={{ verticalAlign: "middle" }}
                  >
                    {model}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-left font-semibold text-blue-800">
                    Kế hoạch
                  </td>
                  {timeSlots.map((slotObj) => (
                    <td
                      key={slotObj.date}
                      className="border border-gray-300 px-2 py-1 text-center"
                    >
                      <input
                        type="text"
                        value={productionData[model]?.[slotObj.label] || ""}
                        onChange={(e) =>
                          handleProductionChange(model, slotObj.label, e)
                        }
                        className="w-full text-center border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        maxLength={5}
                        inputMode="numeric"
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold text-blue-800">
                    {totalPlan}
                  </td>
                </tr>
                <tr className="bg-green-50 hover:bg-green-100">
                  <td className="border border-gray-300 px-2 py-1 text-left font-semibold text-green-800">
                    Thực tế
                  </td>
                  {timeSlots.map((slotObj) => (
                    <td
                      key={slotObj.date}
                      className="border border-gray-300 px-2 py-1 text-center"
                    >
                      <input
                        type="text"
                        value={actualData[model]?.[slotObj.label] || ""}
                        onChange={(e) =>
                          handleActualChange(model, slotObj.label, e)
                        }
                        className="w-full text-center border border-green-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-400"
                        maxLength={5}
                        inputMode="numeric"
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
                    const plan = Number(
                      productionData[model]?.[slotObj.label] || 0
                    );
                    const actual = Number(
                      actualData[model]?.[slotObj.label] || 0
                    );
                    const ratio =
                      plan > 0 ? ((actual / plan) * 100).toFixed(1) : "0.0";
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
        className="bg-white p-6 max-w-md mx-auto rounded shadow"
        overlayClassName="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50"
      >
        <h2 className="text-lg font-bold mb-4">🛠 Quản lý Line</h2>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {draftModelList.map((model, index) => (
            <li key={index} className="flex gap-2">
              <input
                value={model}
                onChange={(e) => {
                  const updated = [...draftModelList];
                  updated[index] = e.target.value;
                  setDraftModelList(updated);
                }}
                className="border px-2 py-1 rounded flex-1"
              />
              <button
                onClick={() =>
                  setDraftModelList(
                    draftModelList.filter((_, i) => i !== index)
                  )
                }
              >
                ❌
              </button>
            </li>
          ))}
        </ul>
        <div className="flex mt-4 gap-2">
          <input
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="Thêm Line mới"
            className="border px-2 py-1 rounded flex-1"
          />
          <button
            onClick={() => {
              const trimmed = newModelName.trim();
              if (trimmed) {
                setDraftModelList([...draftModelList, trimmed]);
                setNewModelName("");
              }
            }}
            className="bg-green-600 text-white px-4 py-1 rounded"
          >
            ➕
          </button>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={() => setModelEditOpen(false)}
            className="bg-gray-300 px-4 py-1 rounded"
          >
            Đóng
          </button>
          <button
            onClick={() => {
              set(ref(db, `assignments/${areaKey}/modelList`), draftModelList)
                .then(() => {
                  showToast("✅ Đã cập nhật Line");
                  setModelList(draftModelList);
                  setModelEditOpen(false);
                })
                .catch(() => {
                  showToast("❌ Lỗi khi lưu Line!");
                });
            }}
            className="bg-blue-600 text-white px-4 py-1 rounded"
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
        attendanceData={attendanceData}
        timeSlots={timeSlots}
        weekKey={weekKey}
        modelList={modelList}
        selectedDate={format(selectedDate, "yyyy-MM-dd")}
      />
    </div>
  );
};

export default AreaProductionTable;
