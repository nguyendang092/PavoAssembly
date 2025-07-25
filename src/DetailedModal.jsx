import React, { useEffect, useState } from "react";
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
  const diff = (now - start + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000) / 86400000;
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
export default function DetailedModal({ isOpen, onClose, area }) {
  const [selectedArea, setSelectedArea] = useState(area || "Assembly");
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekNumber().toString());
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
    if (!selectedArea || !selectedWeek || !selectedDate) return;
    const fetchData = async () => {
      setLoading(true);
      const path = `details/${selectedArea}/${selectedWeek}`;
      const snapshot = await get(child(ref(db), path));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const details = [];
        for (const model in data) {
          const modelData = data[model];
          if (modelData[selectedDate]) {
            const quantity = modelData[selectedDate];
            details.push({ model, date: selectedDate, quantity });
          }
        }
        setAllDetailData(details);
      } else {
        setAllDetailData([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedArea, selectedWeek, selectedDate]);
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-[90vw] h-[90vh] p-4 rounded shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
  <div className="flex-1 text-center">
    <h2 className="text-xl font-bold uppercase inline-block">Bảng chi tiết sản lượng</h2>
  </div>
  <button
    onClick={onClose}
    className="text-red-500 text-base font-bold ml-auto"
  >
    Đóng
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
    placeholder="Search Model"
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
        indexAxis: "y",
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
            ticks: { color: "#000", font: { weight: "bold", size: 10 } },
            grid: { display: false },
            max: (() => {
        // Lấy max data trong datasets[0].data rồi cộng thêm 50
        if (!chartData || !chartData.datasets || chartData.datasets.length === 0) return undefined;
        const maxVal = Math.max(...chartData.datasets[0].data);
        return maxVal + 50;
      })(),
    
          },
          y: {
            ticks: { color: "#000", font: { weight: "bold", size: 10 } },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.parsed.x || 0;
                return val.toLocaleString();
              },
            },
          },
          datalabels: {
            anchor: "end",
            align: "end",
            color: "#000",
            font: { weight: "bold", size: 10 },
            formatter: (value) => value.toLocaleString(),
          },
        },
      }}
    />
            ) : loading ? (
              <p>Đang tải biểu đồ...</p>
            ) : (
              <p>Không có dữ liệu để hiển thị.</p>
            )}
          </div>
          {/* Bảng chi tiết (1/3) */}
          <div className="w-1/3 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border-b p-1 text-left">Arena</th>
                  <th className="border-b p-1 text-left">Model</th>
                  <th className="border-b p-1 text-left">Ngày</th>
                  <th className="border-b p-1 text-right">Sản lượng</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, visibleCount).map((item, i) => (
                  <tr key={i}>
                    <td className="border-b p-1">{selectedArea}</td>
                    <td className="border-b p-1">{item.model}</td>
                    <td className="border-b p-1">{item.date}</td>
                    <td className="border-b p-1 text-right">{item.quantity.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > visibleCount && (
              <button
                onClick={() => setVisibleCount(visibleCount + 10)}
                className="mt-2 w-full bg-blue-500 hover:bg-blue-700 py-1 rounded font-bold text-white"
              >
                Xem thêm
              </button>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
