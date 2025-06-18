import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, set } from "firebase/database";
import { format, getWeek, startOfWeek, addDays, getYear } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Modal from "react-modal";
import ChartModal from "./ChartModal";
import AttendanceModal from "./AttendanceModal";
import AddEmployeeModal from "./AddEmployeeModal";

Modal.setAppElement("#root");

const AreaProductionTable = ({ area }) => {
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const areaKey = area.replace(/\//g, "_");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [actualData, setActualData] = useState({});
  const [productionData, setProductionData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

  const weekNumber = getWeek(selectedDate, { weekStartsOn: 1 });
  const year = getYear(selectedDate);
  const weekKey = `week_${year}_${weekNumber}`;

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
      setActualData((prev) => {
        const newData = { ...prev };
        if (!newData[model]) newData[model] = {};
        newData[model][slot] = val;
        set(
          ref(db, `actual/${areaKey}/${weekKey}/${model}/${slot}`),
          val === "" ? 0 : Number(val)
        ).catch(() => alert("Lỗi cập nhật thực tế!"));
        return newData;
      });
    }
  };

  const handleProductionChange = (model, slot, e) => {
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

  const modelList = [
    "SILICON REAR 46-55",
    "LEAK TEST REAR",
    "LEAK TEST FRONT",
    "METAL DECO 46-55",
    "GLASS 46-55",
    "MTC FRONT 46-55",
    "KM24",
  ];

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
            onClick={() => changeWeek("prev")}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← Tuần trước (지난 주)
          </button>
          <button
            onClick={() => changeWeek("next")}
            className="ml-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Tuần sau (다음 주) →
          </button>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setAddEmployeeModalOpen(true)}
            className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            ➕ Thêm phân công (직원 추가)
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            📥 Xuất Excel (엑셀저장)
          </button>
          <button
            onClick={() => setModalIsOpen(true)}
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📊 Biểu đồ (차트)
          </button>
          <button
            onClick={() => setAttendanceModalOpen(true)}
            className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            🧑‍🤝‍🧑 Nhân viên (직원)
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 italic font-semibold mb-2">
        Tuần {weekNumber} ({format(startDateOfWeek, "dd/MM/yyyy")} -{" "}
        {format(addDays(startDateOfWeek, 6), "dd/MM/yyyy")})
      </div>

      <div className="flex items-center justify-between mb-4">
        <label className="font-semibold text-gray-800">
          Chọn ngày (날짜 선택):{" "}
          <input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={handleDateChange}
            className="border border-gray-300 rounded px-2 py-1 ml-2"
          />
        </label>
        <span className="text-sm text-gray-600 italic">
          Tuần (주): {weekNumber} ({weekKey})
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
              Total (합계)
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
                    Kế hoạch (계획)
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
                    Thực tế (실적)
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
                    % Hoàn thành (% 완료)
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
      />
      <AddEmployeeModal
        isOpen={addEmployeeModalOpen}
        onClose={() => setAddEmployeeModalOpen(false)}
        areaKey={areaKey}
        weekKey={weekKey}
        modelList={modelList}
      />
    </div>
  );
};

export default AreaProductionTable;
