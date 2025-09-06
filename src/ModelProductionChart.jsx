
import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getISOWeek } from "date-fns";


const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a28edb", "#f08fc0", "#8dd1e1", "#ffbb28"
];

function getTodayStr() {
  return new Date().toLocaleDateString("vi-VN");
}

const initialFilter = {
  area: "",
  mode: "current",
  week: getISOWeek(new Date()),
};

const ModelProductionChart = () => {
  const [rawData, setRawData] = useState([]);
  const [areas, setAreas] = useState([]);
  const [filter, setFilter] = useState(initialFilter);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      const validRows = json.filter((row) => row.WorkplaceName && row.ItemCode && row.Week);
      setRawData(validRows);
      const areaList = [...new Set(validRows.map((row) => row.WorkplaceName))];
      setAreas(areaList);
      setFilter((prev) => ({ ...prev, area: areaList[0] || "" }));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAreaChange = (e) => setFilter((prev) => ({ ...prev, area: e.target.value }));
  const handleFilterChange = (e) => setFilter((prev) => ({ ...prev, mode: e.target.value }));
  const handleWeekChange = (e) => {
    const weekStr = e.target.value;
    const date = new Date(weekStr + "-1");
    setFilter((prev) => ({ ...prev, week: getISOWeek(date) }));
  };

  const chartData = useMemo(() => {
    if (!filter.area) return [];
    const filtered = rawData.filter((row) => {
      if (row.WorkplaceName !== filter.area) return false;
      if (filter.mode === "current" && parseInt(row.Week) !== filter.week) return false;
      return true;
    });
    const grouped = {};
    filtered.forEach((row) => {
      const model = row.ItemCode;
      const weekKey = `Week_${row.Week}`;
      const qty = parseInt(row.GoodProductEfficiency || 0);
      if (!model || isNaN(qty)) return;
      if (!grouped[model]) grouped[model] = { model };
      grouped[model][weekKey] = (grouped[model][weekKey] || 0) + qty;
    });
    return Object.values(grouped);
  }, [rawData, filter]);

  const allWeeks = useMemo(() => {
    return Array.from(
      new Set(
        chartData.flatMap((row) => Object.keys(row).filter((k) => k.startsWith("Week_")))
      )
    ).sort();
  }, [chartData]);


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-blue-600">📦 Biểu đồ Sản lượng theo Khu vực & Model</h2>
      <p className="text-gray-500 mb-4">📅 Hôm nay: {getTodayStr()}</p>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="border p-2 rounded bg-white" />
        {areas.length > 0 && (
          <>
            <select value={filter.area} onChange={handleAreaChange} className="border p-2 rounded bg-white">
              {areas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <select value={filter.mode} onChange={handleFilterChange} className="border p-2 rounded bg-white">
              <option value="current">📆 Tuần hiện tại</option>
              <option value="all">📂 Tất cả tuần</option>
            </select>
            <input type="week" onChange={handleWeekChange} className="border p-2 rounded" disabled={filter.mode === "all"} />
          </>
        )}
      </div>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={600}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 100 }}>
            <XAxis dataKey="model" type="category" angle={-45} textAnchor="end" interval={0} height={80} />
            <YAxis type="number" />
            <Tooltip />
            <Legend />
            {allWeeks.map((week, index) => (
              <Bar key={week} dataKey={week} stackId="a" fill={COLORS[index % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 italic mt-4">Vui lòng chọn file Excel để xem biểu đồ.</p>
      )}
    </div>
  );
};

export default ModelProductionChart;
