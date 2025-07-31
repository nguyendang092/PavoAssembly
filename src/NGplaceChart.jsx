/* Đây là component hiển thị biểu đồ sản lượng */
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Bar } from "react-chartjs-2";
import { FiUpload } from "react-icons/fi"; // import biểu tượng upload
import { useTranslation } from "react-i18next";
import DetailedNGModal from "./DetailedNGModal";
import { useUser } from "./UserContext";
import { logUserAction } from "./userLog";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from "chart.js";
import { format, parseISO, getISOWeek } from "date-fns";
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
const getCurrentWeekNumber = () => {
  const today = new Date();
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  const pastDaysOfYear = (today - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

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
export default function NGWorkplaceChart() {
  const { user } = useUser();
  const { t } = useTranslation();
  const [chartData, setChartData] = useState(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [weekData, setWeekData] = useState({});
  const [dataMap, setDataMap] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalArea, setModalArea] = useState("");

  // Hàm đóng modal chi tiết
  const closeDetailModal = () => {
    setIsModalOpen(false);
    setModalArea("");
  };
// Loading state
const [loading, setLoading] = useState(false);
// Tối ưu: chỉ load dữ liệu cho tuần được chọn
useEffect(() => {
  setLoading(true);
  const fetchData = async () => {
    try {
      const ngRef = ref(db, "ng");
      const snapshot = await get(ngRef);
      if (!snapshot.exists()) {
        setChartData(null);
        setDataMap({});
        setWeekData({});
        setLoading(false);
        return;
      }
      const ngData = snapshot.val();
      // Chỉ build danh sách tuần
      const weekList = [];
      for (const workplace in ngData) {
        for (const week in ngData[workplace]) {
          if (!weekList.includes(week)) weekList.push(week);
        }
      }
      weekList.sort();
      setWeekData(weekList.reduce((acc, w) => { acc[w] = true; return acc; }, {}));
      // Chọn tuần hiện tại nếu có, nếu không thì tuần mới nhất
      if (!selectedWeek && weekList.length > 0) {
        const currentWeek = getCurrentWeekNumber().toString();
        if (weekList.includes(currentWeek)) {
          setSelectedWeek(currentWeek);
        } else {
          setSelectedWeek(weekList[weekList.length - 1]);
        }
        setLoading(false);
        return;
      }
      if (!selectedWeek) {
        setChartData(null);
        setDataMap({});
        setLoading(false);
        return;
      }
      // Build dữ liệu cho tuần đang chọn
      const rows = [];
      for (const workplace in ngData) {
        if (!ngData[workplace][selectedWeek]) continue;
        for (const rework in ngData[workplace][selectedWeek]) {
          for (const day in ngData[workplace][selectedWeek][rework]) {
            for (const model in ngData[workplace][selectedWeek][rework][day]) {
              for (const shift in ngData[workplace][selectedWeek][rework][day][model]) {
                const qty = ngData[workplace][selectedWeek][rework][day][model][shift];
                rows.push({
                  workplace,
                  week: selectedWeek,
                  rework,
                  day,
                  model,
                  shift,
                  qty,
                });
              }
            }
          }
        }
      }
      // Chuẩn bị dataMap cho bảng tổng
      const map = {};
      rows.forEach((row) => {
        if (!map[row.workplace]) map[row.workplace] = {};
        if (!map[row.workplace][row.day]) map[row.workplace][row.day] = { normal: 0, rework: 0 };
        if (row.rework === "Rework") {
          map[row.workplace][row.day].rework += Number(row.qty) || 0;
        } else {
          map[row.workplace][row.day].normal += Number(row.qty) || 0;
        }
      });
      setDataMap(map);
      // Chuẩn bị dữ liệu cho biểu đồ
      const workplaces = Object.keys(map);
      let days = Array.from(new Set(rows.map(r => r.day))).sort();
      // Loại bỏ ngày chủ nhật ("Chủ nhật" hoặc "Sunday")
      days = days.filter(day => {
        const lower = day.toLowerCase();
        return lower !== "chủ nhật" && lower !== "sunday";
      });
      const datasets = workplaces.map((workplace, i) => {
        return {
          label: workplace,
          data: days.map(day => (map[workplace][day]?.normal || 0) + (map[workplace][day]?.rework || 0)),
          backgroundColor: [
            "#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"
          ][i % 10],
          borderRadius: 6,
        };
      });
      setChartData({ labels: days, datasets });
    } catch (err) {
      setChartData(null);
      setDataMap({});
      setWeekData({});
      console.error("Lỗi load dữ liệu NG:", err);
    }
    setLoading(false);
  };
  fetchData();
}, [selectedWeek]);

  // ✅ Hàm sanitize và upload
  const sanitizeKey = (key) => key?.toString().replace(/[.#$/\[\]]/g, "_") || "unknown";

const uploadFromExcel = async (file, user) => {
  if (!file) return alert("Vui lòng chọn file Excel!");
  setLoading(true);
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      // Kiểm tra định dạng cột
      if (!jsonData[0]?.OrganizationName || !jsonData[0]?.WEEK || !jsonData[0]?.ReworkOrNot || !jsonData[0]?.time_monthday || !jsonData[0]?.ItemCode || typeof jsonData[0]?.FaultyQuantity === "undefined") {
        setLoading(false);
        return alert("File Excel thiếu cột hoặc sai định dạng!");
      }
      const updates = {};
      jsonData.forEach((row) => {
        const workplace = sanitizeKey(row.OrganizationName);
        const week = sanitizeKey(row.WEEK);
        const rework = sanitizeKey(row.ReworkOrNot);
        // Chuyển day sang yyyy-mm-dd
        let day = sanitizeKey(row.time_monthday);
        // Nếu day là dạng 'Jul 28 ' thì chuyển sang yyyy-mm-dd
        if (/^[A-Za-z]{3} \d{2} $/.test(day)) {
          const [monthStr, dayStr] = day.trim().split(' ');
          const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(monthStr) + 1;
          const year = new Date().getFullYear();
          day = `${year}-${month.toString().padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
        }
        const model = sanitizeKey(row.ItemCode);
        const quantity = row.FaultyQuantity || 0;
        const path = `ng/${workplace}/${week}/${rework}/${day}/${model}/Day`;
        updates[path] = quantity;
      });
      if (user && user.email) {
        await logUserAction(user.email, "upload_faulty_data", "Upload từ file Excel lỗi");
      }
      await update(ref(db), updates);
      alert("Upload thành công!");
    } catch (err) {
      console.error("Lỗi xử lý file:", err);
      alert("Lỗi xử lý file Excel: " + err.message);
    }
    setLoading(false);
  };
  reader.readAsBinaryString(file);
};

// Handle khi người dùng chọn file
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (file) uploadFromExcel(file, user);
};

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-70 z-50 flex items-center justify-center">
          <span className="text-blue-700 text-2xl font-bold animate-pulse">Đang xử lý dữ liệu...</span>
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-72 flex flex-col p-6 bg-gradient-to-b from-indigo-600 to-purple-600 shadow-lg border-r overflow-hidden">
        <div className="flex-grow">
          <h2 className="text-2xl font-bold text-white mb-6 uppercase flex items-center gap-2 tracking-wide">
            {t("workplaceChart.menuTitle")}
          </h2>
          {Object.keys(weekData).length > 0 && (
            <div className="mb-4">
              <label className="block text-white font-medium mb-2">
                {t("workplaceChart.selectWeek")}
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none mb-2 bg-white"
              >
                {Object.keys(weekData)
                  .filter(week => {
                    // Ẩn tuần nếu tất cả ngày của tuần là chủ nhật
                    if (!chartData || !chartData.labels) return true;
                    const days = chartData.labels.map(label => label.toLowerCase());
                    return !days.includes("chủ nhật") && !days.includes("sunday");
                  })
                  .map((week) => (
                    <option key={week} value={week}>
                      {t("workplaceChart.week")} {week}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
        {user && (
          <div className="flex flex-col gap-4 w-full px-1">
            <div className="flex items-center gap-2 bg-white/30 rounded-lg p-2 shadow">
              <label htmlFor="file-upload-total" className="cursor-pointer p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200" title="Chọn file">
                <FiUpload size={18} />
              </label>
              <span className="text-white text-sm font-medium flex-1 text-center">
                {t("workplaceChart.chooseExceltotal")}
              </span>
              <input id="file-upload-total" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}
      </aside>
      {/* Main content */}
      <main className="flex-1 p-2 flex gap-8" style={{ height: "93vh" }}>
        {/* Chart 2/3 */}
        <section className="basis-2/3 bg-white rounded-xl shadow-lg p-6 flex flex-col">
          <h3 className="text-xl font-bold mb-4 text-indigo-700 tracking-wide">{t("workplaceChart.chartTitle")}</h3>
          <div className="flex-1 flex items-center justify-center">
            {chartData ? (
              <Bar
                data={chartData}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false, position: "bottom" },
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
                      barPercentage: 0.3,
                      categoryPercentage: 0.6,
                      grid: { display: false, color: "#e0e0e0" },
                      ticks: {
                        color: "#333",
                        font: { weight: "bold", size: 14 },
                      },
                    },
                    y: {
                      ticks: {
                        callback: function (value) {
                          const label = this.getLabelForValue(value);
                          return label.length > 15 ? label.slice(0, 15) + "..." : label;
                        },
                        font: { size: 14, weight: "bold" },
                        color: "#333",
                      },
                      grid: {
                        display: true,
                        color: "#e0e0e0",
                        lineWidth: 0.8,
                      },
                    },
                  },
                }}
                plugins={[ChartDataLabels, extraLabelPlugin]}
              />
            ) : (
              <p className="text-gray-400 text-lg font-medium">{t("workplaceChart.pleaseSelectExcel")}</p>
            )}
          </div>
        </section>
        {/* Bảng chi tiết 1/3 */}
        <section className="basis-1/3 bg-white rounded-xl shadow-lg p-2 flex flex-col overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-black uppercase">{t("workplaceChart.outputByArea")}</h3>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none min-w-[140px] bg-white"
            >
              <option value="">{t("workplaceChart.selectArea")}</option>
              {Object.keys(dataMap).map((area) => (
                <option key={area} value={area}>
                  {t(`areas.${area}`)}
                </option>
              ))}
            </select>
          </div>
          {chartData ? (
            <>
              <table className="min-w-full text-left border-collapse table-auto text-sm">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-700 uppercase">
                    <th className="border-b pb-1 px-2">{t("workplaceChart.areaDay")}</th>
                    <th className="border-b pb-1 px-2 text-right">{t("workplaceChart.normal")}</th>
                    <th className="border-b pb-1 px-2 text-right">{t("workplaceChart.rework")}</th>
                    <th className="border-b pb-1 px-2 text-right font-bold">{t("workplaceChart.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(dataMap)
                    .filter(([area]) => selectedArea === "" || selectedArea === area)
                    .map(([area, dayObj]) => {
                      let totalNormal = 0;
                      let totalRework = 0;
                      chartData.labels.forEach((day) => {
                        const d = dayObj[day] || { normal: 0, rework: 0 };
                        totalNormal += d.normal;
                        totalRework += d.rework;
                      });
                      return (
                        <React.Fragment key={area}>
                          <tr className="bg-indigo-100 font-semibold uppercase">
                            <td className="px-2 py-1">{t(`areas.${area}`)}</td>
                            <td className="text-right px-2 py-1">{totalNormal.toLocaleString()}</td>
                            <td className="text-right px-2 py-1">{totalRework.toLocaleString()}</td>
                            <td className="text-right px-2 py-1">{(totalNormal + totalRework).toLocaleString()}</td>
                          </tr>
                          {chartData.labels.map((label) => {
                            const d = dayObj[label] || { normal: 0, rework: 0 };
                            const total = d.normal + d.rework;
                            if (total === 0) return null;
                            return (
                              <tr key={label} className="text-gray-700">
                                <td className="pl-8 py-1">{label}</td>
                                <td className="text-right px-2 py-1">{d.normal.toLocaleString()}</td>
                                <td className="text-right px-2 py-1">{d.rework.toLocaleString()}</td>
                                <td className="text-right px-2 py-1">{total.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setModalArea(selectedArea || Object.keys(dataMap)[0] || "");
                    setIsModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded font-bold"
                >
                  {t("workplaceChart.viewDetail")}
                </button>
                <button
                  onClick={() => {
                    exportToExcel && exportToExcel();
                  }}
                  className="font-bold text-white px-3 py-2 bg-green-600 rounded hover:bg-green-700"
                >
                  {t("workplaceChart.exportExcel")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-lg font-medium">Không có dữ liệu hiển thị.</p>
          )}
        </section>
      </main>
      <DetailedNGModal isOpen={isModalOpen} onClose={closeDetailModal} area={modalArea} />
    </div>
  );
}
