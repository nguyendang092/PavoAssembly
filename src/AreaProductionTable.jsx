import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue, set } from "firebase/database";

const timeSlots = [
  "6:00-8:00",
  "8:00-10:00",
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
];

const AreaProductionTable = ({ area }) => {
  const areaKey = area.replace(/\//g, "_");
  const [actualData, setActualData] = useState({});
  const [productionData, setProductionData] = useState({});

  useEffect(() => {
    const actualRef = ref(db, `actual/${areaKey}`);
    const productionRef = ref(db, `production/${areaKey}`);

    const unsubActual = onValue(actualRef, (snapshot) => {
      setActualData(snapshot.val() || {});
    });

    const unsubProduction = onValue(productionRef, (snapshot) => {
      setProductionData(snapshot.val() || {});
    });

    return () => {
      unsubActual();
      unsubProduction();
    };
  }, [areaKey]);

  const handleActualChange = (slot, e) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*$/.test(val)) {
      setActualData((prev) => {
        const newData = { ...prev, [slot]: val };
        set(ref(db, `actual/${areaKey}/${slot}`), val === "" ? 0 : Number(val)).catch(() =>
          alert("Lỗi cập nhật thực tế!")
        );
        return newData;
      });
    }
  };

  const handleProductionChange = (slot, e) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]*$/.test(val)) {
      setProductionData((prev) => {
        const newData = { ...prev, [slot]: val };
        set(ref(db, `production/${areaKey}/${slot}`), val === "" ? 0 : Number(val)).catch(() =>
          alert("Lỗi cập nhật sản lượng!")
        );
        return newData;
      });
    }
  };

  return (
    <table className="w-full border-collapse text-sm text-gray-700">
      <thead>
        <tr className="bg-gray-200">
          <th className="border border-gray-300 px-3 py-2 text-left">Giờ</th>
          {timeSlots.map((slot) => (
            <th key={slot} className="border border-gray-300 px-2 py-2 text-center">
              {slot}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* Dòng sản lượng (input editable) */}
        <tr className="bg-blue-50 hover:bg-blue-100">
          <td className="border border-gray-300 px-3 py-2 font-semibold text-left text-blue-800">
            Kế hoạch
          </td>
          {timeSlots.map((slot) => (
            <td key={slot} className="border border-gray-300 px-2 py-1 text-center">
              <input
                type="text"
                value={productionData[slot] || ""}
                onChange={(e) => handleProductionChange(slot, e)}
                className="w-full text-center border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={5}
                inputMode="numeric"
              />
            </td>
          ))}
        </tr>

        {/* Dòng thực tế (input editable) */}
        <tr className="bg-green-50 hover:bg-green-100">
          <td className="border border-gray-300 px-3 py-2 font-semibold text-left text-green-800">
            Thực tế
          </td>
          {timeSlots.map((slot) => (
            <td key={slot} className="border border-gray-300 px-2 py-1 text-center">
              <input
                type="text"
                value={actualData[slot] || ""}
                onChange={(e) => handleActualChange(slot, e)}
                className="w-full text-center border border-green-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-400"
                maxLength={5}
                inputMode="numeric"
              />
            </td>
          ))}
        </tr>

        {/* Dòng tỉ lệ hoàn thành (read-only) */}
        <tr className="bg-yellow-50 hover:bg-yellow-100">
          <td className="border border-gray-300 px-3 py-2 font-semibold text-left text-yellow-800">
            Tỉ lệ hoàn thành (%)
          </td>
          {timeSlots.map((slot) => {
            const actual = Number(actualData[slot]) || 0;
            const production = Number(productionData[slot]) || 0;
            const ratio = production > 0 ? ((actual / production) * 100).toFixed(1) : "0.0";
            return (
              <td key={slot} className="border border-gray-300 px-2 py-1 text-center font-semibold">
                {ratio}%
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
};

export default AreaProductionTable;
