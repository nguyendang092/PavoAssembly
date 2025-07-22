import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getISOWeek, parseISO } from "date-fns";

const ModelProductionChart = () => {
  const [rawData, setRawData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [filterMode, setFilterMode] = useState("current");
  const [selectedWeek, setSelectedWeek] = useState(getISOWeek(new Date()));

  const todayStr = new Date().toLocaleDateString("vi-VN");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      setRawData(json);

      const areaList = [...new Set(json.map((row) => row.WorkplaceName))];
      setAreas(areaList);
      const initialArea = areaList[0];
      setSelectedArea(initialArea);

      processChartData(json, initialArea, filterMode, selectedWeek);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleAreaChange = (e) => {
    const area = e.target.value;
    setSelectedArea(area);
    processChartData(rawData, area, filterMode, selectedWeek);
  };

  const handleFilterChange = (e) => {
    const mode = e.target.value;
    setFilterMode(mode);
    processChartData(rawData, selectedArea, mode, selectedWeek);
  };

  const handleWeekChange = (e) => {
    const weekStr = e.target.value;
    const date = new Date(weekStr + "-1"); // Add weekday to get correct ISO week
    const week = getISOWeek(date);
    setSelectedWeek(week);
    processChartData(rawData, selectedArea, filterMode, week);
  };

  const processChartData = (data, area, mode, week) => {
    const filtered = data.filter((row) => {
      if (row.WorkplaceName !== area) return false;
      if (mode === "current" && parseInt(row.Week) !== week) return false;
      return true;
    });

    const grouped = {};
    const weekSet = new Set();

    filtered.forEach((row) => {
      const model = row.ItemCode;
      const weekKey = `Week_${row.Week}`;
      const qty = parseInt(row.GoodProductEfficiency || 0);

      if (!model || isNaN(qty)) return;

      if (!grouped[model]) {
        grouped[model] = { model };
      }
      grouped[model][weekKey] = (grouped[model][weekKey] || 0) + qty;
      weekSet.add(weekKey);
    });

    setChartData(Object.values(grouped));
  };

  const allWeeks = Array.from(
    new Set(
      chartData.flatMap((row) =>
        Object.keys(row).filter((k) => k.startsWith("Week_"))
      )
    )
  ).sort();

  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7f50",
    "#a28edb",
    "#f08fc0",
    "#8dd1e1",
    "#ffbb28",
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-blue-600">
        📦 Biểu đồ Sản lượng theo Khu vực & Model
      </h2>
      <p className="text-gray-500 mb-4">📅 Hôm nay: {todayStr}</p>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="border p-2 rounded bg-white"
        />

        {areas.length > 0 && (
          <>
            <select
              value={selectedArea}
              onChange={handleAreaChange}
              className="border p-2 rounded bg-white"
            >
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>

            <select
              value={filterMode}
              onChange={handleFilterChange}
              className="border p-2 rounded bg-white"
            >
              <option value="current">📆 Tuần hiện tại</option>
              <option value="all">📂 Tất cả tuần</option>
            </select>

            <input
              type="week"
              onChange={handleWeekChange}
              className="border p-2 rounded"
              disabled={filterMode === "all"}
            />
          </>
        )}
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={600}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 30, bottom: 100 }}
          >
            <XAxis
              dataKey="model"
              type="category"
              angle={-45}
              textAnchor="end"
              interval={0}
              height={80}
            />
            <YAxis type="number" />
            <Tooltip />
            <Legend />
            {allWeeks.map((week, index) => (
              <Bar
                key={week}
                dataKey={week}
                stackId="a"
                fill={colors[index % colors.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 italic mt-4">
          Vui lòng chọn file Excel để xem biểu đồ.
        </p>
      )}
    </div>
  );
};

export default ModelProductionChart;