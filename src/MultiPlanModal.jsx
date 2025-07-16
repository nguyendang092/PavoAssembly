import React, { useState } from "react";
import Modal from "react-modal";
import { ref, set } from "firebase/database";
import { db } from "./firebase";
import { format, startOfWeek, addDays } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useTranslation } from "react-i18next";

const timeLabels = [
  "08:00 - 10:00",
  "10:10 - 11:30",
  "12:30 - 15:00",
  "15:10 - 17:00",
  "17:30 - 20:00",
];

const MultiPlanModal = ({ isOpen, onClose, areaKey, modelList }) => {
  const [selectedDates, setSelectedDates] = useState([]);
  const [planData, setPlanData] = useState({});
const { t } = useTranslation();
  // ✅ HÀM CHỌN 7 NGÀY TRONG TUẦN
  const selectCurrentWeek = () => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Thứ Hai
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    setSelectedDates(days);
  };

  const handleApply = async () => {
    for (const date of selectedDates) {
      const dateKey = format(date, "yyyy-MM-dd");

      for (const model of modelList) {
        const modelPlan = planData[model] || {};
        const total = Object.values(modelPlan).reduce(
          (sum, val) => sum + Number(val || 0),
          0
        );

        for (const [slot, value] of Object.entries(modelPlan)) {
          await set(
            ref(db, `production/${areaKey}/${dateKey}/${model}/${slot}`),
            Number(value || 0)
          );
        }

        await set(
          ref(db, `production/${areaKey}/${dateKey}/${model}/total`),
          total
        );
      }
    }
    alert(t("multiPlanModal.success"));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white p-6 max-w-7xl mx-auto rounded shadow overflow-auto max-h-[100vh]"
      overlayClassName="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50"
    >
      <h2 className="text-lg font-bold mb-4 uppercase">{t("multiPlanModal.title")}</h2>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
          <button
            onClick={selectCurrentWeek}
            className="mb-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {t("multiPlanModal.thisWeek")}
          </button>
          <DayPicker
            mode="multiple"
            selected={selectedDates}
            onSelect={setSelectedDates}
            showOutsideDays
            fixedWeeks
            captionLayout="dropdown"
            fromYear={2023}
            toYear={2026}
            modifiersClassNames={{
              selected: "bg-green-600 text-white font-bold rounded",
              today: "text-blue-600 font-semibold underline",
            }}
            className="bg-white border rounded shadow-sm p-4 text-sm"
          />
          
        </div>

        {/* Nhập sản lượng theo chiều ngang */}
        <div className="flex-1 overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-sm text-gray-700">
            <thead className="bg-gray-100 text-gray-800 text-[14px] uppercase">
              <tr>
                <th className="border px-3 py-2 text-left">{t("multiPlanModal.model")}</th>
                {timeLabels.map((slot) => (
                  <th key={slot} className="border px-3 py-2 text-center font-semibold text-xs">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelList.map((model) => (
                <tr
                  key={model}
                  className="even:bg-white odd:bg-gray-50 hover:bg-yellow-50 transition duration-200"
                >
                  <td className="border px-3 py-2 font-medium text-gray-900">
                    {model}
                  </td>
                  {timeLabels.map((slot) => (
                    <td key={slot} className="border px-2 py-1 text-center">
                      <input
                        type="number"
                        title={t("multiPlanModal.enterPlan")}
                        className="border border-gray-300 rounded px-2 py-1 text-center w-20 focus:outline-none focus:ring-2 focus:ring-green-400"
                        value={planData[model]?.[slot] || ""}
                        onChange={(e) => {
                          const updated = { ...(planData[model] || {}) };
                          updated[slot] = e.target.value;
                          setPlanData((prev) => ({ ...prev, [model]: updated }));
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-5 py-1.5 rounded transition"
        >
          {t("multiPlanModal.cancel")}
        </button>
        <button
          onClick={handleApply}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-1.5 rounded transition"
        >
          {t("multiPlanModal.apply")}
        </button>
      </div>
    </Modal>
  );
};

export default MultiPlanModal;
