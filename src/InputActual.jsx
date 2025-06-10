import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set } from "firebase/database";

const DEBOUNCE_DELAY = 500;

const InputActual = ({ area, slot, initialValue }) => {
  const [value, setValue] = useState(initialValue ?? "");
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(() => {
      // Gửi dữ liệu lên Firebase
      const key = area.replace(/\//g, "_");
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        set(ref(db, `actual/${key}/${slot}`), numValue).catch(() =>
          alert("Lỗi cập nhật!")
        );
      }
    }, DEBOUNCE_DELAY);

    setDebounceTimer(timer);

    return () => clearTimeout(timer);
  }, [value, area, slot]);

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
    />
  );
};

export default InputActual;
