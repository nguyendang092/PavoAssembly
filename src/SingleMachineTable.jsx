import React, { useState, useEffect } from "react";
import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase";
import { format, eachDayOfInterval, endOfMonth } from "date-fns";
import { getDay } from "date-fns";

const PAGE_SIZE = 10;

const SingleMachineTable = ({area,  machine, selectedMonth, showToast }) => {
  const [data, setData] = useState({ temperature: {}, humidity: {} });
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const daysInMonth = eachDayOfInterval({
  start: new Date(`${selectedMonth}-01`),
  end: endOfMonth(new Date(`${selectedMonth}-01`)),
}).filter((date) => getDay(date) !== 0); // loại bỏ Chủ Nhật

  const totalPages = Math.ceil(daysInMonth.length / PAGE_SIZE);
  const pagedDays = daysInMonth.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
  const path = `temperature_monitor/${area}/${machine}/${selectedMonth}`;
  const dataRef = ref(db, path);
  const unsubscribe = onValue(dataRef, (snapshot) => {
    const val = snapshot.val() || { temperature: {}, humidity: {} };
    setData(val);
  });

  setCurrentPage(1);
  return () => unsubscribe();
}, [area, machine, selectedMonth]);

  const handleInputChange = (type, day, value) => {
    setData((prev) => {
      const updated = { ...prev };
      if (!updated[type]) updated[type] = {};
      updated[type][day] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const type of ["temperature", "humidity"]) {
        const entries = data[type] || {};
        for (const [day, val] of Object.entries(entries)) {
  const path = `temperature_monitor/${area}/${machine}/${selectedMonth}/${type}/${day}`;
  const valueToSave = val === "" ? null : parseFloat(val);
  await set(ref(db, path), valueToSave);
}
      }
      if (showToast) showToast(`✅ Đã lưu dữ liệu cho máy ${machine}`);
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      if (showToast) showToast("❌ Lưu dữ liệu thất bại!");
    } finally {
      setSaving(false);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="mb-8 border rounded p-4 shadow-md max-w-full">
      <h3 className="text-xl font-semibold mb-2">{machine}</h3>

      <table className="w-full border text-sm min-w-max">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Ngày</th>
            <th className="border px-2 py-1">🌡️ Nhiệt độ (℃)</th>
            <th className="border px-2 py-1">💧 Độ ẩm (%)</th>
          </tr>
        </thead>
        <tbody>
          {pagedDays.map((date) => {
            const day = format(date, "dd");
            return (
              <tr key={day}>
                <td className="border px-2 py-1 text-center font-semibold text-gray-800">
                  {format(date, "dd/MM/yyyy")}
                </td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="number"
                    className="w-full border px-1 py-0.5 text-center rounded"
                    value={data.temperature?.[day] || ""}
                    onChange={(e) => handleInputChange("temperature", day, e.target.value)}
                  />
                </td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="number"
                    className="w-full border px-1 py-0.5 text-center rounded"
                    value={data.humidity?.[day] || ""}
                    onChange={(e) => handleInputChange("humidity", day, e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Phân trang */}
      <div className="flex justify-center items-center mt-4 space-x-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          ← Trước
        </button>
        <span>
          Trang {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Sau →
        </button>
      </div>

      {/* Nút Lưu */}
      <div className="flex justify-center mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </div>
  );
};

export default SingleMachineTable;