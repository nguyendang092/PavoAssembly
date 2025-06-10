// src/component/InputProductionRow.jsx
import React from "react";
import InputActual from "./InputActual";

const InputProductionRow = ({ timeSlots, area, actual, keyName }) => {
  return (
    <tr className="bg-white hover:bg-gray-50">
      <td className="border px-4 py-2 font-medium text-gray-700">Sản lượng</td>
      {timeSlots.map((slot) => (
        <td key={slot} className="border px-2 py-1">
          <InputActual
            area={area}
            slot={slot}
            initialValue={actual?.[keyName]?.[slot] || ""}
          />
        </td>
      ))}
    </tr>
  );
};

export default InputProductionRow;
