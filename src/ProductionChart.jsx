import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ProductionLineChart = ({ data, viewMode, syncId }) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 50, left: 20, bottom: 5 }}
        syncId={syncId} // đồng bộ với các biểu đồ khác có cùng syncId
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
        />
        {/* Trục Y bên trái */}
        <YAxis
          yAxisId="left"
          label={{
            value: viewMode === "day" ? "Số lượng / slot" : "Số lượng / ngày",
            angle: -90,
            position: "insideLeft",
          }}
        />
        {/* Trục Y bên phải */}
        <YAxis
          yAxisId="right"
          orientation="right"
          label={{
            value: "% Hoàn thành",
            angle: 90,
            position: "insideRight",
          }}
          domain={[0, 120]}
          tickFormatter={(tick) => `${tick}%`}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === "% Hoàn thành") return `${value}%`;
            return value;
          }}
        />
        <Legend verticalAlign="top" height={36} />

        {/* Các đường line với yAxisId tương ứng */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="plan"
          stroke="#8884d8"
          activeDot={{ r: 8 }}
          name="Kế hoạch"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="actual"
          stroke="#82ca9d"
          name="Thực tế"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="ratio"
          stroke="#ffc658"
          name="% Hoàn thành"
          strokeDasharray="3 3"
          dot={false} // làm đường nét mượt, không có chấm
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ProductionLineChart;
