import React, { useState } from "react";
import { format } from "date-fns";
import SingleMachineTable from "./SingleMachineTable";

const areaMachinesMap = {
  PRESS: ["PRESS_1", "PRESS_2"],
  MC: ["MC_1", "MC_2", "MC_3"],
  ASSEMBLY: ["ASSEMBLY_1"],
};

const TemperatureMonitor = () => {
  const [selectedArea, setSelectedArea] = useState("PRESS");
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const machines = areaMachinesMap[selectedArea] || [];

  return (
    <div className="p-6 bg-white rounded shadow max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">📋 Theo dõi nhiệt độ & độ ẩm theo khu vực</h2>

      <div className="flex justify-center space-x-6 mb-6">
        <label className="text-sm">
          📍 Khu vực:
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="ml-2 px-3 py-1 border rounded"
          >
            {Object.keys(areaMachinesMap).map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          📅 Tháng:
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="ml-2 px-3 py-1 border rounded"
          />
        </label>
      </div>

      {machines.length === 0 && (
        <p className="text-center text-gray-600">Không có máy đo nào trong khu vực này.</p>
      )}

      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {machines.map((machine) => (
          <div key={machine} className="overflow-x-auto">
            <SingleMachineTable machine={machine} selectedMonth={selectedMonth} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemperatureMonitor;
