import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";

const WorkplaceChart = ({ selectedLeader }) => {
  const [data, setData] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const groupedData = {};

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      jsonData.forEach((row) => {
        const dateRaw = row["ProductionEfficiencyDate"]?.toString().trim();
        const workplace = row["WorkplaceName"]?.toString().trim();
        const quantity = Number(row["ProductionResultQuantity"]) || 0;

        if (!dateRaw || !workplace) return;

        const date = new Date(dateRaw);
        if (isNaN(date)) return;

        // Kiểm tra nếu không nằm trong tuần hiện tại thì bỏ qua
        if (!isWithinInterval(date, { start: weekStart, end: weekEnd })) return;

        const dateStr = date.toISOString().slice(0, 10);
        if (!groupedData[dateStr]) groupedData[dateStr] = { date: dateStr };

        if (!selectedLeader || workplace === selectedLeader) {
          groupedData[dateStr][workplace] =
            (groupedData[dateStr][workplace] || 0) + quantity;
        }
      });

      const formattedData = Object.values(groupedData).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      console.log("✅ formattedData (this week):", formattedData);
      setData(formattedData);
    };

    reader.readAsBinaryString(file);
  };

  const workplaces =
    data.length > 0
      ? Object.keys(data[0]).filter((key) => key !== "date")
      : [];

  return (
    <div className="p-4">
      <input type="file" accept=".xlsx" onChange={handleFileUpload} />
      {data.length > 0 && (
        <div className="mt-6" style={{ height: 500 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {workplaces.map((workplace, index) => (
                <Bar
                  key={workplace}
                  dataKey={workplace}
                  fill={`hsl(${index * 60}, 70%, 50%)`}
                  barSize={40}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default WorkplaceChart;
