// src/component/InputActualRow.jsx
import React from "react";

const InputActualRow = ({ timeSlots, areaKey, actual, updateActual }) => {
  return (
    <tr className="bg-gray-50 hover:bg-gray-100">
      <td className="border px-4 py-2 font-medium text-gray-700">Thực tế</td>
      {timeSlots.map((slot) => (
        <td key={slot} className="border px-2 py-1">
          <input
            type="number"
            value={actual?.[areaKey]?.[slot] || ""}
            onChange={(e) =>
              updateActual(areaKey, slot, parseInt(e.target.value) || 0)
            }
            className="w-full px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </td>
      ))}
    </tr>
  );
};

export default InputActualRow;
