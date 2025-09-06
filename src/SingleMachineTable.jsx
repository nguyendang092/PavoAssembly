
import React, { useState, useEffect, useMemo } from "react";
import { ref, set, onValue } from "firebase/database";
import { db } from "./firebase";
import { format, eachDayOfInterval, endOfMonth, getDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { ko } from "date-fns/locale";
import { useUser } from "./UserContext";
import { logUserAction } from "./userLog";

const PAGE_SIZE = 10;

// Validate: chỉ cho phép số >= 0, tối đa 2 chữ số thập phân
function validateValue(val) {
  if (val === "") return true;
  const num = Number(val);
  if (isNaN(num) || num < 0) return false;
  if (/\./.test(val)) {
    const [, decimal] = val.split(".");
    if (decimal && decimal.length > 2) return false;
  }
  return true;
}

const localeMap = { ko, vi: undefined };

function getCurrentLocale(i18n) {
  return localeMap[i18n.language] || undefined;
}

function formatDate(date, i18n) {
  if (i18n.language === "ko") {
    return format(date, "yyyy년 MM월 dd일", { locale: getCurrentLocale(i18n) });
  }
  return format(date, "MM/dd/yyyy");
}


const SingleMachineTable = ({ area, machine, selectedMonth, showToast }) => {
  const { user } = useUser();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState({ temperature: {}, humidity: {} });
  const [ui, setUI] = useState({ currentPage: 1, saving: false, loading: false });

  // Tính toán ngày trong tháng (loại Chủ Nhật)
  const daysInMonth = useMemo(() =>
    eachDayOfInterval({
      start: new Date(`${selectedMonth}-01`),
      end: endOfMonth(new Date(`${selectedMonth}-01`)),
    }).filter((date) => getDay(date) !== 0),
    [selectedMonth]
  );
  const totalPages = Math.ceil(daysInMonth.length / PAGE_SIZE);
  const pagedDays = useMemo(() => daysInMonth.slice((ui.currentPage - 1) * PAGE_SIZE, ui.currentPage * PAGE_SIZE), [daysInMonth, ui.currentPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setUI((prev) => ({ ...prev, currentPage: page }));
  };


  useEffect(() => {
    let isMounted = true;
    if (!area || !machine || !selectedMonth) return;
    setUI((prev) => ({ ...prev, loading: true }));
    const path = `temperature_monitor/${area}/${machine}/${selectedMonth}`;
    const dataRef = ref(db, path);
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        if (!isMounted) return;
        const val = snapshot.val() || { temperature: {}, humidity: {} };
        setData(val);
        setUI((prev) => ({ ...prev, loading: false }));
      },
      () => { if (isMounted) setUI((prev) => ({ ...prev, loading: false })); }
    );
    // Auto page to today if in this month
    const today = new Date();
    const thisMonth = new Date(`${selectedMonth}-01`);
    if (today.getMonth() === thisMonth.getMonth() && today.getFullYear() === thisMonth.getFullYear()) {
      const index = daysInMonth.findIndex((d) => format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"));
      setUI((prev) => ({ ...prev, currentPage: index !== -1 ? Math.floor(index / PAGE_SIZE) + 1 : 1 }));
    } else {
      setUI((prev) => ({ ...prev, currentPage: 1 }));
    }
    return () => { isMounted = false; unsubscribe(); };
  }, [area, machine, selectedMonth, daysInMonth]);


  const handleInputChange = (type, day, value) => {
    if (!validateValue(value)) return;
    setData((prev) => {
      const updated = { ...prev };
      if (!updated[type]) updated[type] = {};
      updated[type][day] = value;
      return updated;
    });
  };


  const handleSave = async () => {
    setUI((prev) => ({ ...prev, saving: true }));
    try {
      const promises = [];
      for (const type of ["temperature", "humidity"]) {
        const entries = data[type] || {};
        for (const [day, val] of Object.entries(entries)) {
          const path = `temperature_monitor/${area}/${machine}/${selectedMonth}/${type}/${day}`;
          const valueToSave = val === "" ? null : parseFloat(val);
          promises.push(set(ref(db, path), valueToSave));
        }
      }
      await Promise.all(promises);
      if (user && user.email) {
        await logUserAction(user.email, "save_temperature_humidity", `Lưu dữ liệu máy: ${machine}, khu vực: ${area}, tháng: ${selectedMonth}`);
      }
      if (showToast) showToast(t("temperatureMonitor.saveSuccess", { machine }));
    } catch (error) {
      console.error("Lỗi lưu dữ liệu:", error);
      if (showToast) showToast(t("temperatureMonitor.saveFail"));
    } finally {
      setUI((prev) => ({ ...prev, saving: false }));
    }
  };



  return (
    <div className="mb-8 border rounded p-4 shadow-md max-w-full">
      <h3 className="text-xl font-semibold mb-2">{t(`machineNames.${machine}`)}</h3>
      {ui.loading ? (
        <div className="text-center py-8 text-lg text-gray-500">{t("temperatureMonitor.loading")}</div>
      ) : (
        <>
          <table className="w-full border text-sm min-w-max">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">{t("temperatureMonitor.date")}</th>
                <th className="border px-2 py-1">{t("temperatureMonitor.temperature")}</th>
                <th className="border px-2 py-1">{t("temperatureMonitor.humidity")}</th>
              </tr>
            </thead>
            <tbody>
              {pagedDays.map((date) => {
                const day = format(date, "dd");
                return (
                  <tr key={day}>
                    <td className="border px-2 py-1 text-center font-semibold text-gray-800">{formatDate(date, i18n)}</td>
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border px-1 py-0.5 text-center rounded"
                        value={data.temperature?.[day] || ""}
                        onChange={(e) => handleInputChange("temperature", day, e.target.value)}
                        disabled={!user}
                      />
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="w-full border px-1 py-0.5 text-center rounded"
                        value={data.humidity?.[day] || ""}
                        onChange={(e) => handleInputChange("humidity", day, e.target.value)}
                        disabled={!user}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex justify-center items-center mt-4 space-x-2">
            <button onClick={() => goToPage(ui.currentPage - 1)} disabled={ui.currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">{t("temperatureMonitor.previous")}</button>
            <span>{t("temperatureMonitor.page", { current: ui.currentPage, total: totalPages })}</span>
            <button onClick={() => goToPage(ui.currentPage + 1)} disabled={ui.currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">{t("temperatureMonitor.next")}</button>
          </div>
          {/* Save Button */}
          {user && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleSave}
                disabled={ui.saving}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {ui.saving ? t("temperatureMonitor.saving") : t("temperatureMonitor.save")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SingleMachineTable;
