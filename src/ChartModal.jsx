// ChartModal.jsx
import React from "react";
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

const ChartModal = ({ isOpen, onClose, weekNumber, chartData }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Biểu đồ sản lượng"
      style={{
        content: {
          maxWidth: "900px",
          margin: "auto",
          height: "450px",
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
      <LineChart
  width={850}
  height={280}
  data={chartData}
  margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
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
    label={{
      value: "% Hoàn thành",
      angle: 90,
      position: "insideRight",
    }}
  />
  <Tooltip />
  <Legend verticalAlign="top" />
  <Line
    yAxisId="left"
    type="monotone"
    dataKey="plan"
    stroke="#8884d8"
    name="Kế hoạch"
    label={{ position: "top", fontSize: 12, fill: "#8884d8" }}
  />
  <Line
    yAxisId="left"
    type="monotone"
    dataKey="actual"
    stroke="#82ca9d"
    name="Thực tế"
    label={{ position: "top", fontSize: 12, fill: "#82ca9d" }}
  />
</LineChart>
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
