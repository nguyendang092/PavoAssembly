import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, set } from "firebase/database";
import { format, getWeek, startOfWeek, addDays } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Modal from "react-modal";
import ChartModal from "./ChartModal";

const timeSlots = [
  "08:00-10:00",
  "10:00-11:30",
  "12:30-15:00",
  "15:00-17:00",
  "17:30-20:00",
];

// Modal accessibility
Modal.setAppElement("#root");

const AreaProductionTable = ({ area }) => {
  const areaKey = area.replace(/\//g, "_");

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [actualData, setActualData] = useState({});
  const [productionData, setProductionData] = useState({});
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const weekNumber = getWeek(selectedDate, { weekStartsOn: 1 });
  const year = selectedDate.getFullYear();
  const weekKey = `week_${year}_${weekNumber}`;

  const startDateOfWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDays(startDateOfWeek, i)
  );

  useEffect(() => {
    const actualRef = ref(db, `actual/${areaKey}/${weekKey}`);
    const productionRef = ref(db, `production/${areaKey}/${weekKey}`);

    const unsubActual = onValue(actualRef, (snapshot) => {
      setActualData(snapshot.val() || {});
    });

    const unsubProduction = onValue(productionRef, (snapshot) => {
      setProductionData(snapshot.val() || {});
    });

    return () => {
      unsubActual();
      unsubProduction();
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

  const handleActualChange = (dayIndex, slot, e) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*$/.test(val)) {
      setActualData((prev) => {
        const newData = { ...prev };
        if (!newData[dayIndex]) newData[dayIndex] = {};
        newData[dayIndex][slot] = val;
        set(
          ref(db, `actual/${areaKey}/${weekKey}/${dayIndex}/${slot}`),
          val === "" ? 0 : Number(val)
        ).catch(() => alert("Lỗi cập nhật thực tế!"));
        return newData;
      });
    }
  };

  const handleProductionChange = (dayIndex, slot, e) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*$/.test(val)) {
      setProductionData((prev) => {
        const newData = { ...prev };
        if (!newData[dayIndex]) newData[dayIndex] = {};
        newData[dayIndex][slot] = val;
        set(
          ref(db, `production/${areaKey}/${weekKey}/${dayIndex}/${slot}`),
          val === "" ? 0 : Number(val)
        ).catch(() => alert("Lỗi cập nhật sản lượng!"));
        return newData;
      });
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [["Ngày", "Slot", "Kế hoạch", "Thực tế", "Tỉ lệ"]];
    weekDates.forEach((date, dayIndex) => {
      const dayLabel = format(date, "dd/MM/yyyy");
      timeSlots.forEach((slot) => {
        const plan = productionData[dayIndex]?.[slot] || 0;
        const actual = actualData[dayIndex]?.[slot] || 0;
        const ratio =
          plan > 0 ? ((actual / plan) * 100).toFixed(1) + "%" : "0.0%";
        wsData.push([dayLabel, slot, plan, actual, ratio]);
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

  // Chuẩn bị dữ liệu cho biểu đồ (theo slot tổng tuần)
  const chartData = timeSlots.map((slot) => {
    let sumPlan = 0;
    let sumActual = 0;
    weekDates.forEach((_, dayIndex) => {
      sumPlan += Number(productionData[dayIndex]?.[slot] || 0);
      sumActual += Number(actualData[dayIndex]?.[slot] || 0);
    });
    const ratio =
      sumPlan > 0 ? Number(((sumActual / sumPlan) * 100).toFixed(1)) : 0;
    return {
      label: slot,
      plan: sumPlan,
      actual: sumActual,
      ratio,
    };
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
        <div>
          <button
            onClick={exportToExcel}
            className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            📥 Xuất Excel (엑셀 내보내기)
          </button>

          <button
            onClick={() => setModalIsOpen(true)}
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📊 Biểu đồ (차트)
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 italic font-semibold mb-2">
        Tuần {weekNumber} (
        {weekDates[0] ? format(weekDates[0], "dd/MM/yyyy") : "--"} -{" "}
        {weekDates[6] ? format(weekDates[6], "dd/MM/yyyy") : "--"})
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
            <th className="border border-gray-300 px-3 py-2 text-left">Ngày</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Loại</th>
            {timeSlots.map((slot) => (
              <th
                key={slot}
                className="border border-gray-300 px-2 py-2 text-center"
              >
                {slot}
              </th>
            ))}
            <th className="border border-gray-300 px-2 py-2 text-center">
              Total (합계)
            </th>
          </tr>
        </thead>
        <tbody>
          {weekDates.map((date, dayIndex) => {
            const dayLabel = (
              <div className="text-blue-800 font-semibold">
                {format(date, "EEEE")}
                <br />
                {format(date, "yyyy/MM/dd")}
              </div>
            );

            const totalProduction = timeSlots.reduce((sum, slot) => {
              return sum + (Number(productionData[dayIndex]?.[slot]) || 0);
            }, 0);

            const totalActual = timeSlots.reduce((sum, slot) => {
              return sum + (Number(actualData[dayIndex]?.[slot]) || 0);
            }, 0);

            const averageRatio =
              totalProduction > 0
                ? ((totalActual / totalProduction) * 100).toFixed(1)
                : "0.0";

            return (
              <React.Fragment key={dayIndex}>
                <tr className="bg-blue-50 hover:bg-blue-100">
                  <td
                    className="border border-gray-300 px-3 py-2 font-semibold text-left text-blue-800"
                    rowSpan={3}
                    style={{ verticalAlign: "middle" }}
                  >
                    {dayLabel}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-left font-semibold text-blue-800">
                    Kế hoạch (계획)
                  </td>
                  {timeSlots.map((slot) => (
                    <td
                      key={slot}
                      className="border border-gray-300 px-2 py-1 text-center"
                    >
                      <input
                        type="text"
                        value={productionData[dayIndex]?.[slot] || ""}
                        onChange={(e) =>
                          handleProductionChange(dayIndex, slot, e)
                        }
                        className="w-full text-center border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        maxLength={5}
                        inputMode="numeric"
                      />
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold text-blue-800">
                    {totalProduction}
                  </td>
                </tr>

                <tr className="bg-green-50 hover:bg-green-100">
                  <td className="border border-gray-300 px-2 py-1 text-left font-semibold text-green-800">
                    Thực tế (실적)
                  </td>
                  {timeSlots.map((slot) => (
                    <td
                      key={slot}
                      className="border border-gray-300 px-2 py-1 text-center"
                    >
                      <input
                        type="text"
                        value={actualData[dayIndex]?.[slot] || ""}
                        onChange={(e) => handleActualChange(dayIndex, slot, e)}
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
                  {timeSlots.map((slot) => {
                    const actual = Number(actualData[dayIndex]?.[slot]) || 0;
                    const production =
                      Number(productionData[dayIndex]?.[slot]) || 0;
                    const ratio =
                      production > 0
                        ? ((actual / production) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <td
                        key={slot}
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

      {/* Modal popup hiển thị biểu đồ */}
      <ChartModal
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
        weekNumber={weekNumber}
        chartData={chartData}
      />
    </div>
  );
};

export default AreaProductionTable;
