import React, { useState, useEffect } from "react";
import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase";
import { format, eachDayOfInterval, endOfMonth } from "date-fns";
import { getDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { ko } from "date-fns/locale";

const PAGE_SIZE = 10;

const SingleMachineTable = ({ area, machine, selectedMonth, showToast }) => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState({ temperature: {}, humidity: {} });
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  const daysInMonth = eachDayOfInterval({
    start: new Date(`${selectedMonth}-01`),
    end: endOfMonth(new Date(`${selectedMonth}-01`)),
  }).filter((date) => getDay(date) !== 0); // loại Chủ Nhật

  const totalPages = Math.ceil(daysInMonth.length / PAGE_SIZE);
  const pagedDays = daysInMonth.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    if (!area || !machine || !selectedMonth) return;

    const path = `temperature_monitor/${area}/${machine}/${selectedMonth}`;
    const dataRef = ref(db, path);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val() || { temperature: {}, humidity: {} };
      setData(val);
    });

    const today = new Date();
    const thisMonth = new Date(`${selectedMonth}-01`);
    if (
      today.getMonth() === thisMonth.getMonth() &&
      today.getFullYear() === thisMonth.getFullYear()
    ) {
      const index = daysInMonth.findIndex(
        (d) => format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
      );
      if (index !== -1) {
        const page = Math.floor(index / PAGE_SIZE) + 1;
        setCurrentPage(page);
      } else {
        setCurrentPage(1);
      }
    } else {
      setCurrentPage(1);
    }

    return () => unsubscribe();
  }, [area, machine, selectedMonth]);

  const handleInputChange = (type, day, value) => {
    setData((prev) => {
      const updated = { ...prev };
      if (!updated[type]) updated[type] = {};
      updated[type][day] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const type of ["temperature", "humidity"]) {
        const entries = data[type] || {};
        for (const [day, val] of Object.entries(entries)) {
          const path = `temperature_monitor/${area}/${machine}/${selectedMonth}/${type}/${day}`;
          const valueToSave = val === "" ? null : parseFloat(val);
          await set(ref(db, path), valueToSave);
        }
      }
      if (showToast)
        showToast(t("temperatureMonitor.saveSuccess", { machine }));
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      if (showToast) showToast(t("temperatureMonitor.saveFail"));
    } finally {
      setSaving(false);
    }
  };

  // Xác định locale cho date-fns dựa trên ngôn ngữ hiện tại
  const localeMap = {
    ko: ko,
    vi: undefined, // date-fns mặc định (MM/dd/yyyy)
  };
  const currentLocale = localeMap[i18n.language] || undefined;

  // Định dạng ngày theo locale
  const formatDate = (date) => {
    if (i18n.language === "ko") {
      return format(date, "yyyy년 MM월 dd일", { locale: currentLocale });
    }
    // Mặc định hoặc việt: MM/dd/yyyy
    return format(date, "MM/dd/yyyy");
  };

  return (
    <div className="mb-8 border rounded p-4 shadow-md max-w-full">
      <h3 className="text-xl font-semibold mb-2">
        {t(`machineNames.${machine}`)}
      </h3>
      <table className="w-full border text-sm min-w-max">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">{t("temperatureMonitor.date")}</th>
            <th className="border px-2 py-1">
              {t("temperatureMonitor.temperature")}
            </th>
            <th className="border px-2 py-1">
              {t("temperatureMonitor.humidity")}
            </th>
          </tr>
        </thead>
        <tbody>
          {pagedDays.map((date) => {
            const day = format(date, "dd");
            return (
              <tr key={day}>
                <td className="border px-2 py-1 text-center font-semibold text-gray-800">
                  {formatDate(date)}
                </td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="number"
                    className="w-full border px-1 py-0.5 text-center rounded"
                    value={data.temperature?.[day] || ""}
                    onChange={(e) =>
                      handleInputChange("temperature", day, e.target.value)
                    }
                  />
                </td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full border px-1 py-0.5 text-center rounded"
                    value={data.humidity?.[day] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!isNaN(val) || val === "") {
                        handleInputChange("humidity", day, val);
                      }
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-center items-center mt-4 space-x-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          {t("temperatureMonitor.previous")}
        </button>
        <span>
          {t("temperatureMonitor.page", {
            current: currentPage,
            total: totalPages,
          })}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          {t("temperatureMonitor.next")}
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? t("temperatureMonitor.saving")
            : t("temperatureMonitor.save")}
        </button>
      </div>
    </div>
  );
};

export default SingleMachineTable;
