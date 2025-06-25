// ChartView.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, get } from "firebase/database";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getDaysInMonth } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const COLORS = ["#8884d8", "#82ca9d", "#ff7300", "#ff4d4f", "#00bcd4", "#a83279"];

const ChartView = ({ selectedArea, selectedMonth, machines, type }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const result = {};
      const year = parseInt(selectedMonth.split("-")[0], 10);
      const month = parseInt(selectedMonth.split("-")[1], 10) - 1;
      const daysInMonth = getDaysInMonth(new Date(year, month));

      // Khởi tạo dữ liệu cho từng ngày và máy
      for (let d = 1; d <= daysInMonth; d++) {
        const dayKey = d.toString().padStart(2, "0");
        result[dayKey] = { day: dayKey };
        machines.forEach((machine) => {
          result[dayKey][machine] = null; // để đảm bảo chart vẫn có điểm trống nếu không có dữ liệu
        });
      }

      // Lấy dữ liệu từ Firebase
      for (let i = 0; i < machines.length; i++) {
        const machine = machines[i];
        const snapshot = await get(
          ref(db, `temperature_monitor/${machine}/${selectedMonth}/${type}`)
        );
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.entries(data).forEach(([day, value]) => {
            const dayKey = day.padStart(2, "0");
            result[dayKey][machine] = parseFloat(value);
          });
        }
      }

      const sortedData = Object.values(result).sort(
        (a, b) => parseInt(a.day) - parseInt(b.day)
      );
      setChartData(sortedData);
    };

    fetchData();
  }, [selectedArea, selectedMonth, machines, type]);

  // Export Excel
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Biểu đồ");

    const fileName = `${selectedArea}_${selectedMonth}_${type}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, fileName);
  };

  return (
    <div className="overflow-x-auto">
      {/* Nút xuất Excel */}
      <div className="mb-4 text-right">
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition"
        >
          📁 Xuất Excel
        </button>
      </div>

      {/* Biểu đồ */}
      <div style={{ width: `${chartData.length * 80}px`, minWidth: "100%" }}>
        <LineChart
          width={chartData.length * 80}
          height={400}
          data={chartData}
          margin={{ top: 30, right: 50, left: 30, bottom: 40 }}
        >
          <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tick={{
              fill: "#333",
              fontSize: 12,
              fontFamily: "sans-serif",
              angle: -45,
              textAnchor: "end",
            }}
            tickFormatter={(day) => {
              const [, month] = selectedMonth.split("-");
              return `${String(day).padStart(2, "0")}/${month}`;
            }}
            interval={0}
          />
          <YAxis
            unit={type === "temperature" ? "°C" : "%"}
            tick={{ fill: "#333", fontSize: 12, fontFamily: "sans-serif" }}
            axisLine={{ stroke: "#999" }}
            tickLine={{ stroke: "#999" }}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "sans-serif",
              fontSize: 13,
              borderRadius: 6,
            }}
            formatter={(value) =>
              value !== undefined && value !== null
                ? `${value}${type === "temperature" ? "°C" : "%"}`
                : "Không có dữ liệu"
            }
          />
          <Legend
            wrapperStyle={{
              fontSize: 13,
              fontFamily: "sans-serif",
              color: "#333",
            }}
          />
          {machines.map((machine, index) => (
            <Line
              key={machine}
              type="monotone"
              dataKey={machine}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={true} // ✅ đảm bảo vẽ liên tục nếu có giá trị null
            />
          ))}
        </LineChart>
      </div>
    </div>
  );
};

export default ChartView;
