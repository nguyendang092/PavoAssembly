import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

Modal.setAppElement("#root");

const ChartModal = ({ isOpen, onClose, weekNumber, chartData = {}, modelList = [] }) => {
  // Nếu modelList rỗng thì selectedModel = "" để tránh lỗi
  const [selectedModel, setSelectedModel] = useState(modelList.length > 0 ? modelList[0] : "");

  // Khi modelList thay đổi, tự động set lại selectedModel (trường hợp modelList load sau)
  useEffect(() => {
    if (modelList.length > 0 && !modelList.includes(selectedModel)) {
      setSelectedModel(modelList[0]);
    }
  }, [modelList, selectedModel]);

  // Lấy dữ liệu cho model hiện tại hoặc [] nếu không có
  const modelData = Array.isArray(chartData[selectedModel]) ? chartData[selectedModel] : [];

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Biểu đồ sản lượng"
      style={{
        content: {
          maxWidth: "1200px",
          margin: "auto",
          height: "500px",
          padding: "20px",
        },
        overlay: {
          backgroundColor: "rgba(0,0,0,0.5)",
        },
      }}
    >
      <h2 className="text-xl font-semibold mb-4">
        Biểu đồ sản lượng tuần {weekNumber}
      </h2>

      <div className="mb-4">
        <label className="font-semibold mr-2">Chọn model:</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
          disabled={modelList.length === 0}
        >
          {modelList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {modelData.length > 0 ? (
        <LineChart
          width={1100}
          height={300}
          data={modelData}
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis
            yAxisId="left"
            label={{ value: "Sản lượng", angle: -90, position: "insideLeft" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            label={{ value: "% Hoàn thành", angle: 90, position: "insideRight" }}
          />
          <Tooltip />
          <Legend verticalAlign="top" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="plan"
            stroke="#8884d8"
            name="Kế hoạch"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="actual"
            stroke="#82ca9d"
            name="Thực tế"
          />
        </LineChart>
      ) : (
        <p className="text-center text-gray-500 italic">Không có dữ liệu để hiển thị.</p>
      )}

      <button
        onClick={onClose}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Đóng
      </button>
    </Modal>
  );
};

export default ChartModal;
