// TemperatureMonitor.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";

const TemperatureMonitor = () => {
  const [temperatures, setTemperatures] = useState({});

  useEffect(() => {
    const tempRef = ref(db, "temperature"); // ví dụ: db/temperature
    onValue(tempRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTemperatures(data);
      }
    });
  }, []);

  return (
    <div className="p-6 font-sans bg-gray-50 pt-24">
      <h1 className="text-2xl font-bold mb-4 text-center text-red-600">🌡️ Theo dõi nhiệt độ</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(temperatures).map(([area, value]) => (
          <div
            key={area}
            className="bg-white p-4 rounded shadow border border-gray-200"
          >
            <h2 className="text-lg font-semibold mb-2">{area}</h2>
            <p className="text-3xl font-bold text-blue-500">{value}°C</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemperatureMonitor;
