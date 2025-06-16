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
  Label,
  ResponsiveContainer,
} from "recharts";

Modal.setAppElement("#root");

 const CustomLabel2= (props) => {
    const { x, y, value } = props;
    return (
      <text
        x={x}
        y={y + 20}
        fill="#ef3bf5"
        fontSize={14} // chỉnh kích thước chữ
        fontWeight="bold" // in đậm chữ
        textAnchor="middle"
      >
        {value}
      </text>
    );
  };
 const CustomLabel1= (props) => {
    const { x, y, value } = props;
    return (
      <text
        x={x}
        y={y - 10}
        fill="#0707f2"
        fontSize={14} // chỉnh kích thước chữ
        fontWeight="bold" // in đậm chữ
        textAnchor="middle"
      >
        {value}
      </text>
    );
  };
const ChartModal = ({
  isOpen,
  onClose,
  weekNumber,
  chartData = {},
  modelList = [],
}) => {
  const [selectedModel, setSelectedModel] = useState(
    modelList.length > 0 ? modelList[0] : ""
  );

  useEffect(() => {
    if (modelList.length > 0 && !modelList.includes(selectedModel)) {
      setSelectedModel(modelList[0]);
    }
  }, [modelList, selectedModel]);

  const modelData = Array.isArray(chartData[selectedModel])
    ? chartData[selectedModel]
    : [];

 

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Biểu đồ sản lượng"
      style={{
        content: {
          maxWidth: "1300px",
          margin: "auto",
          height: "700px",
          padding: "20px",
        },
        overlay: {
          backgroundColor: "rgba(0,0,0,0.5)",
        },
      }}
    >
      <h2 className="text-xl font-semibold mb-4">
        Sản lượng tuần {weekNumber}
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
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={modelData}
            margin={{ top: 60, right: 20, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="0"
            stroke="#909091"
            vertical={false}
            horizontal={false}
            />
            <XAxis
              dataKey="label"
              interval={0}
              height={60}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y + 40}
                  textAnchor="middle"
                  fontSize={18}
                  fill="#333"
                  fontWeight="bold"
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis
              yAxisId="left"
              label={{
                value: "Sản lượng",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                fontWeight: "bold"
              }}
              tick={({ x, y, payload }) => (
                <text
                  x={x - 35 }
                  y={y}
                  fontSize={14}
                  fill="#333"
                  fontWeight="bold"
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 220]}
              label={{
                value: "% Hoàn thành",
                angle: 90,
                position: "insideRight",
                offset: -10,
                fontWeight: "bold"
                
              }}
              tick={({ x, y, payload }) => (
                <text
                  x={x + 15}
                  y={y}
                  fontSize={14}
                  fill="#333"
                  fontWeight="bold"
                >
                  {payload.value}
                </text>
              )}
            />
            <Tooltip />
            <Legend
              verticalAlign="top"
              wrapperStyle={{
                paddingBottom: "60px",
                fontSize: "18px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            />

            {/* Line kế hoạch */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="plan"
              stroke="#0707f2"
              strokeWidth={3}
              name="Kế hoạch (계획)"
              activeDot={{ r: 6 }}
              label={CustomLabel1}
            />

            {/* Line thực tế */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="actual"
              stroke="#ef3bf5"
              strokeWidth={3}
              name="Thực tế(실제)"
              activeDot={{ r: 6 }}
              label={CustomLabel2}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-500 italic">
          Không có dữ liệu để hiển thị.
        </p>
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
