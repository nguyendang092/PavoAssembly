import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { logUserAction } from "./userLog";
import { ref, get, child } from "firebase/database";
import { db } from "./firebase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
function getCurrentWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff =
    (now -
      start +
      (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000) /
    86400000;
  return Math.ceil((diff + start.getDay() + 1) / 7);
}
function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function getWeekNumber(dateStr) {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}
import { useUser } from "./UserContext";

export default function DetailedNGModal({ isOpen, onClose, area }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [selectedArea, setSelectedArea] = useState(area || "Press");
  const [selectedWeek, setSelectedWeek] = useState(
    getCurrentWeekNumber().toString()
  );
  const [selectedDate, setSelectedDate] = useState(getYesterday());
  const [selectedModel, setSelectedModel] = useState("");
  const [areas, setAreas] = useState([]);
  const [allDetailData, setAllDetailData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  useEffect(() => {
    const fetchAreas = async () => {
      const snapshot = await get(ref(db, "details"));
      if (snapshot.exists()) {
        setAreas(Object.keys(snapshot.val()));
      }
    };
    fetchAreas();
  }, []);
  useEffect(() => {
    if (selectedDate) {
      const weekNum = getWeekNumber(selectedDate);
      setSelectedWeek(weekNum.toString());
    }
  }, [selectedDate]);
  useEffect(() => {
    if (!isOpen || !selectedArea || !selectedDate) return;
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      const areaRef = ref(db, `ng/${selectedArea}`);
      const snapshot = await get(areaRef);
      if (!isMounted) return;
      const details = [];
      if (snapshot.exists()) {
        const weekData = snapshot.val();
        for (const weekKey in weekData) {
          const reworkData = weekData[weekKey];
          for (const rework in reworkData) {
            const dayData = reworkData[rework];
            for (const day in dayData) {
              if (day !== selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(day))
                continue;
              const modelData = dayData[day];
              for (const model in modelData) {
                let quantity = 0;
                let notes = "";
                if (
                  typeof modelData[model] === "object" &&
                  modelData[model] !== null
                ) {
                  if (
                    typeof modelData[model].Day === "object" &&
                    modelData[model].Day !== null
                  ) {
                    quantity = modelData[model].Day.quantity ?? 0;
                    notes = modelData[model].Day.reason ?? "";
                  } else {
                    quantity = modelData[model].Day ?? 0;
                  }
                } else if (typeof modelData[model] === "number") {
                  quantity = modelData[model];
                }
                if (quantity > 0) {
                  details.push({
                    model,
                    date: day,
                    quantity,
                    week: weekKey,
                    rework,
                    area: selectedArea,
                    notes,
                  });
                }
              }
            }
          }
        }
      }
      setAllDetailData(details);
      setLoading(false);
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedArea, selectedDate, isOpen]);
  const filteredData = allDetailData.filter((item) =>
    item.model.toLowerCase().includes(selectedModel.toLowerCase())
  );
  const chartData = {
    labels: filteredData.map((item) => item.model),
    datasets: [
      {
        label: "Sản lượng",
        data: filteredData.map((item) => item.quantity),
        backgroundColor: "#4F46E5",
      },
    ],
  };
  useEffect(() => {
    if (!isOpen) {
      setAllDetailData([]);
      setSelectedModel("");
      setVisibleCount(10);
    } else {
      // Ghi log khi mở modal chi tiết sản lượng
      if (user && user.email) {
        logUserAction(
          user.email,
          "view_detail_output",
          `Xem chi tiết sản lượng khu vực: ${selectedArea}, ngày: ${selectedDate}`
        );
      }
    }
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-[90vw] h-[90vh] p-4 rounded shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 text-center">
            <h2 className="text-xl font-bold uppercase inline-block">
              {t("detailedNGModal.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-red-500 text-base font-bold ml-auto"
          >
            {t("detailedNGModal.close")}
          </button>
        </div>

        {/* Bộ lọc */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm cursor-not-allowed opacity-60"
            disabled
          >
            {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={t("detailedNGModal.searchModel")}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-48"
          />
        </div>

        {/* Nội dung chính: Biểu đồ + bảng */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-2/3 pr-4 h-full">
            {chartData && chartData.labels.length > 0 ? (
              <Bar
                data={{
                  ...chartData,
                  datasets: chartData.datasets.map((ds) => ({
                    ...ds,
                    backgroundColor: "rgba(255,105,180,0.7)", // màu hồng
                    borderWidth: 0, // bỏ viền
                  })),
                }}
                options={{
                  indexAxis: "x", // đổi về biểu đồ cột
                  responsive: true,
                  maintainAspectRatio: false,
                  elements: {
                    bar: {
                      borderRadius: 10, // bo tròn góc
                      borderWidth: 0, // không border
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        color: "#000",
                        font: { weight: "bold", size: 14 },
                      },
                      grid: { display: false },
                    },
                    y: {
                      beginAtZero: true,
                      max: (() => {
                        if (
                          !chartData ||
                          !chartData.datasets ||
                          chartData.datasets.length === 0
                        )
                          return undefined;
                        const maxVal = Math.max(...chartData.datasets[0].data);
                        return maxVal + 50;
                      })(),
                      ticks: {
                        color: "#000",
                        font: { weight: "bold", size: 14 },
                      },
                      grid: { display: false },
                    },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const val = context.parsed.y || 0;
                          return val.toLocaleString();
                        },
                      },
                    },
                    datalabels: {
                      anchor: "end",
                      align: "end",
                      color: "#000",
                      font: { weight: "bold", size: 14 },
                      formatter: (value) => value.toLocaleString(),
                    },
                  },
                }}
              />
            ) : loading ? (
              <p className="text-center text-gray-500 italic">
                {t("detailedNGModal.loadingChart")}
              </p>
            ) : (
              <p>{t("detailedNGModal.noChartData")}</p>
            )}
          </div>
          {/* Bảng chi tiết (1/3) */}
          <div className="w-1/3 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border-b p-1 text-center">
                    {t("detailedNGModal.area")}
                  </th>
                  <th className="border-b p-1 text-center">
                    {t("detailedNGModal.model")}
                  </th>
                  <th className="border-b p-1 text-center">
                    {t("detailedNGModal.date")}
                  </th>
                  <th className="border-b p-1 text-center">
                    {t("detailedNGModal.quantity")}
                  </th>
                  <th className="border-b p-1 text-center">
                    {t("detailedNGModal.ngReason")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, visibleCount).map((item, i) => (
                  <tr key={i}>
                    <td className="border-b p-1 text-center">{selectedArea}</td>
                    <td className="border-b p-1 text-center">{item.model}</td>
                    <td className="border-b p-1 text-center">{item.date}</td>
                    <td className="border-b p-1 text-center">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="border-b p-1 text-center">
                      {item.notes || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > visibleCount && (
              <button
                onClick={() => {
                  setVisibleCount(visibleCount + 10);
                  // Ghi log khi người dùng xem thêm dữ liệu
                  if (user && user.email) {
                    logUserAction(
                      user.email,
                      "view_more_detail_output",
                      t("detailedNGModal.logViewMore", {
                        area: selectedArea,
                        date: selectedDate,
                      })
                    );
                  }
                }}
                className="mt-2 w-full bg-blue-500 hover:bg-blue-700 py-1 rounded font-bold text-white"
              >
                {t("detailedNGModal.viewMore")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
