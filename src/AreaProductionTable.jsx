import React, { useEffect, useState, useRef, memo, useCallback } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebase";

const slots = ["06:00-08:00", "08:00-10:00", "10:00-12:00"];

const validateValue = (val) => {
  if (val === "") return "Không được để trống";
  if (isNaN(val)) return "Phải là số";
  if (Number(val) < 0) return "Phải là số >= 0";
  return "";
};

const AreaRow = memo(({ area, actual, production, errors, onUpdate, onReset }) => {
  const key = area.replace(/\//g, "_");

  // Hàm tính tỷ lệ hoàn thành cho 1 slot
  const calcCompletion = (slot) => {
    const act = actual[key]?.[slot];
    const prod = production[key]?.[slot];
    if (prod === 0 || prod === undefined || prod === null) return "-";
    if (act === undefined || act === null) return "-";
    const ratio = (act / prod) * 100;
    return `${ratio.toFixed(1)}%`;
  };

  return (
    <>
      {/* Dòng khu vực */}
      <tr className="bg-gray-100 font-semibold">
        <td className="border border-gray-300 px-3 py-2" rowSpan={3}>
          {area}
        </td>
        <td className="border border-gray-300 px-3 py-2 font-medium text-center" colSpan={slots.length}>
          Thực tế
        </td>
      </tr>

      {/* Dòng input thực tế */}
      <tr>
        {slots.map((slot) => {
          const id = `actual_${key}_${slot}`;
          return (
            <td key={slot} className="border border-gray-300 px-1 py-1 relative">
              <input
                type="number"
                min="0"
                step="1"
                value={actual[key]?.[slot] ?? ""}
                onChange={(e) => onUpdate("actual", area, slot, e.target.value)}
                className={`w-full border rounded px-2 py-1 text-center ${
                  errors[id] ? "border-red-500 focus:outline-red-500" : "border-gray-300 focus:outline-blue-500"
                }`}
                title={errors[id] || ""}
              />
              {actual[key]?.[slot] !== undefined && actual[key][slot] !== "" && (
                <button
                  onClick={() => onReset("actual", area, slot)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                  title="Reset"
                  type="button"
                >
                  ✕
                </button>
              )}
            </td>
          );
        })}
      </tr>

      {/* Dòng sản lượng */}
      <tr className="bg-gray-50">
        <td className="border border-gray-300 px-3 py-2 font-medium text-center" colSpan={slots.length}>
          Sản lượng
        </td>
      </tr>

      {/* Dòng input sản lượng */}
      <tr>
        {slots.map((slot) => {
          const id = `production_${key}_${slot}`;
          return (
            <td key={slot} className="border border-gray-300 px-1 py-1 relative">
              <input
                type="number"
                min="0"
                step="1"
                value={production[key]?.[slot] ?? ""}
                onChange={(e) => onUpdate("production", area, slot, e.target.value)}
                className={`w-full border rounded px-2 py-1 text-center ${
                  errors[id] ? "border-red-500 focus:outline-red-500" : "border-gray-300 focus:outline-blue-500"
                }`}
                title={errors[id] || ""}
              />
              {production[key]?.[slot] !== undefined && production[key][slot] !== "" && (
                <button
                  onClick={() => onReset("production", area, slot)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                  title="Reset"
                  type="button"
                >
                  ✕
                </button>
              )}
            </td>
          );
        })}
      </tr>

      {/* Dòng tỷ lệ hoàn thành */}
      <tr className="bg-gray-200 font-semibold text-center text-sm text-gray-700">
        <td className="border border-gray-300 px-3 py-2 font-medium" colSpan={1}>
          Tỉ lệ hoàn thành (%)
        </td>
        {slots.map((slot) => (
          <td key={slot} className="border border-gray-300 px-1 py-2">
            {calcCompletion(slot)}
          </td>
        ))}
      </tr>
    </>
  );
});

const AreaProductionTable = () => {
  const [assignments, setAssignments] = useState([]);
  const [actual, setActual] = useState({});
  const [production, setProduction] = useState({});
  const [errors, setErrors] = useState({});
  const debounceTimers = useRef({});

  useEffect(() => {
    const assignmentsRef = ref(db, "assignments");
    onValue(assignmentsRef, (snapshot) => {
      const data = snapshot.val();
      setAssignments(data ? Object.values(data) : []);
    });

    const actualRef = ref(db, "actual");
    onValue(actualRef, (snapshot) => {
      setActual(snapshot.val() || {});
    });

    const productionRef = ref(db, "production");
    onValue(productionRef, (snapshot) => {
      setProduction(snapshot.val() || {});
    });
  }, []);

  const updateValue = useCallback((type, area, slot, value) => {
    const key = area.replace(/\//g, "_");
    const id = `${type}_${key}_${slot}`;
    const errMsg = validateValue(value);

    setErrors((prev) => ({ ...prev, [id]: errMsg }));

    if (errMsg) return;

    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }
    debounceTimers.current[id] = setTimeout(() => {
      set(ref(db, `${type}/${key}/${slot}`), Number(value))
        .catch(() => alert("Lỗi cập nhật!"));
    }, 500);
  }, []);

  const resetValue = useCallback((type, area, slot) => {
    const key = area.replace(/\//g, "_");
    const id = `${type}_${key}_${slot}`;

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });

    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }
    debounceTimers.current[id] = setTimeout(() => {
      set(ref(db, `${type}/${key}/${slot}`), null).catch(() =>
        alert("Lỗi cập nhật!")
      );
    }, 300);
  }, []);

  return (
    <div className="p-4 max-w-full overflow-auto">
      <table className="min-w-[700px] border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200 text-gray-700">
            <th className="border border-gray-300 px-3 py-2 text-left" rowSpan={2}>
              Khu vực
            </th>
            {slots.map((slot) => (
              <th key={slot} className="border border-gray-300 px-3 py-2 text-center" colSpan={1}>
                {slot}
              </th>
            ))}
          </tr>
          <tr className="bg-gray-100 text-gray-600">
            {slots.map((slot) => (
              <th key={slot} className="border border-gray-300 px-3 py-1 text-center text-sm">
                Dữ liệu
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assignments.map(({ area }) => (
            <AreaRow
              key={area}
              area={area}
              actual={actual}
              production={production}
              errors={errors}
              onUpdate={updateValue}
              onReset={resetValue}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AreaProductionTable;
