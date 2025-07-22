/* Đây là component hiển thị biểu đồ sản lượng */
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Bar } from "react-chartjs-2";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from "chart.js";
import { format, parseISO } from "date-fns";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { getDatabase, ref, update, get } from "firebase/database";
import { db } from "./firebase"; // đường dẫn tới file cấu hình firebase của bạn

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  ChartDataLabels
);

const extraLabelPlugin = {
  id: "extraLabelPlugin",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      const label = dataset.label || "";
      const shortName = label.length > 40 ? label.slice(0, 3) : label;
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (!bar || value === 0) return;

        ctx.save();
        ctx.font = "bold 10px Arial";
        ctx.fillStyle = "#000";
        ctx.textBaseline = "middle";

        const x = bar.x + 10;
        const y = bar.y + bar.height / 8;
        ctx.fillText(`${shortName}: ${value.toLocaleString()}`, x, y);
        ctx.restore();
      });
    });
  },
};

export default function WorkplaceChart() {
  const [selectedArea, setSelectedArea] = useState("");
  const [weekData, setWeekData] = useState({});
  const [selectedWeek, setSelectedWeek] = useState("");
  const [chartData, setChartData] = useState(null);
  const [dataMap, setDataMap] = useState({});
  const [tableView, setTableView] = useState("detailed");
  const [rawData, setRawData] = useState(null);

  // Load dữ liệu từ Firebase khi component mount
  useEffect(() => {
    const loadDataFromFirebase = async () => {
      try {
        const barRef = ref(db, "bar");
        const snapshot = await get(barRef);
        if (!snapshot.exists()) {
          // Nếu Firebase chưa có dữ liệu thì thôi, đợi upload
          return;
        }
        const barData = snapshot.val();

        // Chuyển dữ liệu từ Firebase về dạng mảng giống dữ liệu Excel
        const rows = [];

        for (const workplaceName in barData) {
          const weeks = barData[workplaceName];
          for (const weekKey in weeks) {
            const reworks = weeks[weekKey];
            for (const reworkKey in reworks) {
              const days = reworks[reworkKey];
              for (const dayKey in days) {
                const shifts = days[dayKey];
                for (const shiftKey in shifts) {
                  const totalProduct = shifts[shiftKey];
                  rows.push({
                    Week: weekKey,
                    WorkplaceName: workplaceName,
                    ReworkorNot: reworkKey,
                    time_monthday: dayKey,
                    WorkingLight: shiftKey,
                    Total_Product: totalProduct,
                  });
                }
              }
            }
          }
        }

        setRawData(rows);
        processExcelData(rows);
      } catch (error) {
        console.error("Lỗi load dữ liệu Firebase:", error);
        alert("Lỗi load dữ liệu Firebase: " + error.message);
      }
    };

    loadDataFromFirebase();
  }, []);

  const uploadToFirebase = async (data) => {
    const updates = {};
    const sanitizeKey = (key) => key.replace(/[.#$/\[\]]/g, "_");
    data.forEach((row) => {
      const {
        Week,
        WorkplaceName,
        ReworkorNot,
        time_monthday,
        WorkingLight,
        Total_Product,
      } = row;

      const safeWorkplaceName = sanitizeKey(WorkplaceName);
  const path = `bar/${safeWorkplaceName}/${Week}/${ReworkorNot}/${time_monthday}/${WorkingLight}`;
  updates[path] = Total_Product;
    });

    await update(ref(db), updates);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      setRawData(jsonData);
      processExcelData(jsonData);
    };
    reader.readAsBinaryString(file);
  };
  const processExcelData = (data) => {
    const grouped = {};
    data.forEach((row) => {
      const week = row["Week"];
      if (!grouped[week]) grouped[week] = [];
      grouped[week].push(row);
    });
    setWeekData(grouped);
    const latestWeek = Math.max(...Object.keys(grouped));
    setSelectedWeek(latestWeek.toString());
  };
  useEffect(() => {
    if (!selectedWeek || !weekData[selectedWeek]) {
      setChartData(null);
      setDataMap({});
      return;
    }
    const rows = weekData[selectedWeek];
    const daysSet = new Set();
    rows.forEach((r) => r.time_monthday && daysSet.add(r.time_monthday));
    const days = Array.from(daysSet).sort((a, b) => new Date(a) - new Date(b));

    const areaSet = new Set();
    rows.forEach((r) => r.WorkplaceName && areaSet.add(r.WorkplaceName));
    const areas = Array.from(areaSet);

    const map = {};
    areas.forEach((area) => {
      map[area] = days.map(() => ({
        Day: { normal: 0, rework: 0 },
        Night: { normal: 0, rework: 0 },
      }));
    });
    rows.forEach((row) => {
      const dayIndex = days.indexOf(row.time_monthday);
      const area = row.WorkplaceName;
      const shift = row.WorkingLight || "Day";
      const val = Number(row.Total_Product) || 0;
      const type = row.ReworkorNot === "Rework" ? "rework" : "normal";

      if (dayIndex !== -1 && map[area]) {
        map[area][dayIndex][shift][type] += val;
      }
    });
    if (map["CNC"]) {
      for (let i = 0; i < days.length; i++) {
        const currentDay = map["CNC"][i].Day;
        const nextNight =
          i + 1 < days.length ? map["CNC"][i + 1].Night : { normal: 0, rework: 0 };
        currentDay.normal += nextNight.normal;
        currentDay.rework += nextNight.rework;
      }
    }
    setDataMap(map);
    const filteredAreas = areas.filter((area) =>
      map[area].some(
        ({ Day, Night }) =>
          Day.normal + Day.rework + Night.normal + Night.rework > 0
      )
    );
    const datasets = filteredAreas.map((area, i) => {
      let dataArr;
      if (area === "CNC") {
        dataArr = map[area].map(({ Day }) => Day.normal + Day.rework);
      } else {
        dataArr = map[area].map(
          ({ Day, Night }) =>
            Day.normal + Day.rework + Night.normal + Night.rework
        );
      }
      return {
        label: area,
        data: dataArr,
        backgroundColor: [
          "#4e79a7",
          "#f28e2c",
          "#e15759",
          "#76b7b2",
          "#59a14f",
          "#edc949",
          "#af7aa1",
          "#ff9da7",
          "#9c755f",
          "#bab0ab",
        ][i % 10],
        borderRadius: 6,
      };
    });
    const labels = days.map((d) => format(parseISO(d), "dd/MM"));
    setChartData({ labels, datasets });
  }, [selectedWeek, weekData]);

  const exportToExcel = () => {
    const headers = ["Khu vực", "Ngày", "Normal", "Rework", "Tổng"];
    const rows = [];
    Object.entries(dataMap)
      .filter(([area]) => selectedArea === "" || selectedArea === area)
      .forEach(([area, dayArr]) => {
        dayArr.forEach((dayData, idx) => {
          const label = chartData.labels[idx];
          let normal, rework;
          if (area === "CNC") {
            normal = dayData.Day.normal;
            rework = dayData.Day.rework;
          } else {
            normal = dayData.Day.normal + dayData.Night.normal;
            rework = dayData.Day.rework + dayData.Night.rework;
          }
          const total = normal + rework;
          if (total === 0) return;
          rows.push([area, label, normal, rework, total]);
        });
      });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sản lượng chi tiết");
    XLSX.writeFile(wb, `san_luong_chi_tiet_tuan_${selectedWeek}.xlsx`);
  };
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 min-h-screen p-6 bg-gradient-to-b from-indigo-600 to-purple-600 shadow-md border-r">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase flex items-center gap-2">
          📁 Menu
        </h2>
        <label className="block text-white font-medium mb-2">
          Chọn file Excel
        </label>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0 file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100 mb-6"
        />
        {Object.keys(weekData).length > 0 && (
          <>
            <label className="block text-white font-medium mb-2">Chọn tuần</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none mb-4"
            >
              {Object.keys(weekData).map((week) => (
                <option key={week} value={week}>
                  Tuần {week}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!rawData) {
                  alert("Vui lòng chọn file Excel trước!");
                  return;
                }
                uploadToFirebase(rawData)
                  .then(() => alert("✅ Upload dữ liệu thành công!"))
                  .catch((error) => alert("❌ Upload lỗi: " + error.message));
              }}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm font-semibold"
            >
              ⬆️ Upload Firebase
            </button>
          </>
        )}
      </div>
      {/* Chart và bảng tổng */}
      <div className="flex-1 p-6 flex gap-6" style={{ height: "91vh" }}>
        {/* Chart */}
        <div style={{ flex: "7", overflowY: "auto" }}>
          {chartData ? (
            <Bar
              data={chartData}
              options={{
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || "";
                        const val = context.parsed.x || 0;
                        return `${label}: ${val.toLocaleString()}`;
                      },
                    },
                  },
                  datalabels: { display: false },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    stacked: false,
                    barPercentage: 0.2,
                    categoryPercentage: 0.5,
                    grid: { display: false },
                    ticks: {
                      color: "#000",
                      font: { weight: "bold", size: 15 },
                    },
                  },
                  y: {
                    ticks: {
                      callback: function (value) {
                        const label = this.getLabelForValue(value);
                        return label.length > 15
                          ? label.slice(0, 15) + "..."
                          : label;
                      },
                      font: { size: 15, weight: "bold" },
                      color: "#000",
                    },
                    grid: { display: false },
                  },
                },
              }}
              plugins={[ChartDataLabels, extraLabelPlugin]}
            />
          ) : (
            <p className="text-gray-500">
              📂 Vui lòng chọn file Excel để hiển thị biểu đồ.
            </p>
          )}
        </div>
        {/* Bảng tổng */}
        <div
          style={{
            flex: "4",
            backgroundColor: "white",
            borderRadius: 8,
            padding: 16,
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            overflowX: "auto",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "300px",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Sản lượng theo khu vực</h3>

            <div className="flex items-center gap-4">
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none"
                style={{ minWidth: 140 }}
              >
                <option value="">-- Chọn khu vực --</option>
                {Object.keys(dataMap).map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {chartData ? (
            tableView === "detailed" ? (
              <>
                <table
                  className="min-w-full text-left border-collapse table-auto text-sm"
                  style={{ fontSize: "0.875rem", lineHeight: 1.2 }}
                >
                  <thead>
                    <tr className="uppercase">
                      <th className="border-b pb-1" style={{ width: "40%" }}>
                        Khu vực / Ngày
                      </th>
                      <th
                        className="border-b pb-1 text-right"
                        style={{ width: "30%" }}
                      >
                        Normal
                      </th>
                      <th
                        className="border-b pb-1 text-right"
                        style={{ width: "15%" }}
                      >
                        Rework
                      </th>
                      <th
                        className="border-b pb-1 text-right font-bold"
                        style={{ width: "25%" }}
                      >
                        Tổng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(dataMap)
                      .filter(
                        ([area]) => selectedArea === "" || selectedArea === area
                      )
                      .map(([area, dayArr]) => {
                        let totalNormal = 0;
                        let totalRework = 0;

                        chartData.labels.forEach((_, idx) => {
                          const { Day, Night } = dayArr[idx] || {
                            Day: {},
                            Night: {},
                          };
                          let normal, rework;

                          if (area === "CNC") {
                            normal = Day.normal;
                            rework = Day.rework;
                          } else {
                            normal = Day.normal + Night.normal;
                            rework = Day.rework + Night.rework;
                          }
                          totalNormal += normal;
                          totalRework += rework;
                        });
                        return (
                          <React.Fragment key={area}>
                            <tr
                              className="bg-gray-200 font-semibold"
                              style={{ fontSize: "1rem" }}
                            >
                              <td style={{ padding: "6px 8px" }}>{area}</td>
                              <td
                                className="text-right"
                                style={{ padding: "6px 8px" }}
                              >
                                {totalNormal.toLocaleString()}
                              </td>
                              <td
                                className="text-right"
                                style={{ padding: "6px 8px" }}
                              >
                                {totalRework.toLocaleString()}
                              </td>
                              <td
                                className="text-right"
                                style={{ padding: "6px 8px" }}
                              >
                                {(totalNormal + totalRework).toLocaleString()}
                              </td>
                            </tr>
                            {chartData.labels.map((label, idx) => {
                              const { Day, Night } = dayArr[idx] || {
                                Day: { normal: 0, rework: 0 },
                                Night: { normal: 0, rework: 0 },
                              };
                              let normal, rework;
                              if (area === "CNC") {
                                normal = Day.normal;
                                rework = Day.rework;
                              } else {
                                normal = Day.normal + Night.normal;
                                rework = Day.rework + Night.rework;
                              }
                              const total = normal + rework;
                              if (total === 0) return null;
                              return (
                                <tr
                                  key={idx}
                                  className="text-gray-700"
                                  style={{ fontSize: "0.8rem" }}
                                >
                                  <td
                                    style={{
                                      paddingLeft: 32,
                                      paddingTop: 2,
                                      paddingBottom: 2,
                                    }}
                                  >
                                    {label}
                                  </td>
                                  <td
                                    className="text-right"
                                    style={{ paddingTop: 2, paddingBottom: 2 }}
                                  >
                                    {normal.toLocaleString()}
                                  </td>
                                  <td
                                    className="text-right"
                                    style={{ paddingTop: 2, paddingBottom: 2 }}
                                  >
                                    {rework.toLocaleString()}
                                  </td>
                                  <td
                                    className="text-right"
                                    style={{ paddingTop: 2, paddingBottom: 2 }}
                                  >
                                    {total.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
                {/* Nút xuất Excel */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={exportToExcel}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Xuất Excel
                  </button>
                </div>
              </>
            ) : (
              // summary view: bảng đơn giản tổng mỗi khu vực
              <table
                className="min-w-full text-left border-collapse table-auto text-sm"
                style={{ fontSize: "0.875rem", lineHeight: 1.2 }}
              >
                <thead>
                  <tr>
                    <th className="border-b pb-1" style={{ width: "40%" }}>
                      Khu vực
                    </th>
                    <th
                      className="border-b pb-1 text-right"
                      style={{ width: "20%" }}
                    >
                      Normal
                    </th>
                    <th
                      className="border-b pb-1 text-right"
                      style={{ width: "20%" }}
                    >
                      Rework
                    </th>
                    <th
                      className="border-b pb-1 text-right font-bold"
                      style={{ width: "20%" }}
                    >
                      Tổng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dataMap).map(([area, dayArr]) => {
                    let totalNormal = 0;
                    let totalRework = 0;
                    dayArr.forEach(({ Day, Night }, idx) => {
                      let normal = Day.normal;
                      let rework = Day.rework;
                      if (area === "CNC") {
                        const nextNight =
                          idx + 1 < dayArr.length
                            ? dayArr[idx + 1].Night
                            : { normal: 0, rework: 0 };
                        normal += nextNight.normal;
                        rework += nextNight.rework;
                      } else {
                        normal += Night.normal;
                        rework += Night.rework;
                      }
                      totalNormal += normal;
                      totalRework += rework;
                    });

                    return (
                      <tr
                        key={area}
                        className="font-semibold"
                        style={{ fontSize: "2rem" }}
                      >
                        <td style={{ padding: "6px 8px" }}>{area}</td>
                        <td
                          className="text-right"
                          style={{ padding: "6px 8px" }}
                        >
                          {totalNormal.toLocaleString()}
                        </td>
                        <td
                          className="text-right"
                          style={{ padding: "6px 8px" }}
                        >
                          {totalRework.toLocaleString()}
                        </td>
                        <td
                          className="text-right"
                          style={{ padding: "6px 8px" }}
                        >
                          {(totalNormal + totalRework).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            <p>Không có dữ liệu hiển thị.</p>
          )}
        </div>
      </div>
    </div>
  );
}
