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
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { getDaysInMonth } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


const COLORS = [
  "#000000",
  "#fabb00",
  "#00FF00",
  "#0000FF",
  "#ff00ee",
  "#a83279",
];

const ChartView = ({ selectedArea, selectedMonth, machines, type }) => {
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const getThreshold = () => {
    if (type === "temperature") return { min: 25, max: 35 };
    if (type === "humidity") return { min: 60, max: 85 };
    return { min: -Infinity, max: Infinity };
  };

  const threshold = getThreshold();

  useEffect(() => {
    const fetchData = async () => {
      const result = {};
      const year = parseInt(selectedMonth.split("-")[0], 10);
      const month = parseInt(selectedMonth.split("-")[1], 10) - 1;
      const daysInMonth = getDaysInMonth(new Date(year, month));
      const newAlerts = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayKey = d.toString().padStart(2, "0");
        result[dayKey] = { day: dayKey };
        machines.forEach((machine) => {
          result[dayKey][machine] = null;
        });
      }

      for (let i = 0; i < machines.length; i++) {
        const machine = machines[i];
        const snapshot = await get(
          ref(db, `temperature_monitor/${machine}/${selectedMonth}/${type}`)
        );
        if (snapshot.exists()) {
          const data = snapshot.val();
          Object.entries(data).forEach(([day, value]) => {
            const dayKey = day.padStart(2, "0");
            const val = parseFloat(value);
            result[dayKey][machine] = val;
            if (val < threshold.min || val > threshold.max) {
              newAlerts.push({
                day: `${dayKey}/${selectedMonth.split("-")[1]}`,
                machine,
                value: val,
                status:
                  val < threshold.min ? "Dưới tiêu chuẩn" : "Vượt tiêu chuẩn",
              });
            }
          });
        }
      }

      const sortedData = Object.values(result).sort(
        (a, b) => parseInt(a.day) - parseInt(b.day)
      );
      setChartData(sortedData);
      setAlerts(newAlerts);
    };

    fetchData();
  }, [selectedArea, selectedMonth, machines, type]);

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(chartData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Biểu đồ");

    const fileName = `${selectedArea}_${selectedMonth}_${type}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, fileName);
  };

  const hasWarning = alerts.length > 0;

  return (
    <div className="overflow-x-auto">
      {/* Thông báo cảnh báo */}
      {hasWarning && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 font-medium">
          ⚠️ Có {alerts.length} giá trị vượt ngưỡng {threshold.min}
          {type === "temperature" ? "°C" : "%"} - {threshold.max}
          {type === "temperature" ? "°C" : "%"}
        </div>
      )}

      {/* Nút xuất Excel */}
      <div className="mb-4 text-right">
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition"
        >
          📁 Xuất Excel
        </button>
      </div>

      {/* Biểu đồ cố định kích thước */}
      <div
        className="mx-auto"
        style={{
          maxWidth: "1200px",
          overflowX: "auto",
        }}
      >
        <LineChart
          width={1200}
          height={420}
          data={chartData}
          margin={{ top: 30, right: 50, left: 30, bottom: 40 }}
        >
          <CartesianGrid vertical={false} horizontal={false} />
          <XAxis
            dataKey="day"
            tick={{
              fill: "#000000",
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
            tick={{ fill: "#000000", fontSize: 12, fontFamily: "sans-serif", fontWeight: "bold",}}
            axisLine={{ stroke: "#999" }}
            tickLine={{ stroke: "#999" }}
          />
          <ReferenceArea
    y1={threshold.min}
    y2={threshold.max}
    strokeOpacity={0}
    fill="rgba(214, 175, 163,0.4)" // xanh nhạt
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
            verticalAlign="top"
            wrapperStyle={{
              fontSize: 15,
              fontFamily: "sans-serif",
              color: "#333",
              marginTop: -10,
            }}
          />
          <ReferenceLine
            y={threshold.min}
            stroke="red"
            strokeDasharray="3 3"
            label={({ viewBox }) => {
              const { y } = viewBox;
              return (
                <text
                  x={5} // 👈 cách trục Y 40px
                  y={y}
                  fill="red"
                  fontSize={12}
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {`Min (${threshold.min})`}
                </text>
              );
            }}
          />
          <ReferenceLine
            y={threshold.max}
            stroke="red"
            strokeDasharray="3 3"
            label={({ viewBox }) => {
              const { y } = viewBox;
              return (
                <text
                  x={5} // 👈 cách trục Y 40px
                  y={y}
                  fill="red"
                  fontSize={12}
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {`Max (${threshold.max})`}
                </text>
              );
            }}
          />
          {machines.map((machine, index) => (
            <Line
              key={machine}
              type="monotone"
              dataKey={machine}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              connectNulls={true}
              dot={({ cx, cy, payload }) => {
                const value = payload[machine];
                if (value === null || value === undefined) return null;
                const isOutOfRange =
                  value < threshold.min || value > threshold.max;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={isOutOfRange ? "red" : "white"}
                    stroke={
                      isOutOfRange ? "red" : COLORS[index % COLORS.length]
                    }
                    strokeWidth={2}
                  />
                );
              }}
            />
          ))}
        </LineChart>
      </div>

      {/* Bảng cảnh báo cụ thể */}
      {hasWarning && (
        <div className="mt-2">
          <h3 className="text-lg font-semibold mb-2">🔍 Chi tiết cảnh báo</h3>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-800">
                <tr>
                  <th className="px-4 py-2 border">Ngày</th>
                  <th className="px-4 py-2 border">Máy</th>
                  <th className="px-4 py-2 border">Giá trị</th>
                  <th className="px-4 py-2 border">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, index) => (
                  <tr key={index} className="bg-white even:bg-gray-50">
                    <td className="px-4 py-2 border">{alert.day}</td>
                    <td className="px-4 py-2 border">{alert.machine}</td>
                    <td className="px-4 py-2 border">
                      {alert.value}
                      {type === "temperature" ? "°C" : "%"}
                    </td>
                    <td className="px-4 py-2 border text-red-600">
                      {alert.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartView;
