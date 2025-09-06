import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";
import AreaProductionTable from "./AreaProductionTable";
import Toast from "./Toast";
import AreaProductionTableTime from "./AreaProductionTableTime";
import AddEmployeeForm from "./AddEmployeeModal";
import { useTranslation } from "react-i18next";

const Employ = ({ showToast, selectedLeader }) => {
  const params = useParams();
  const leaderFromUrl = params.leader;
  const { t } = useTranslation();
  // Group UI state
  const [ui, setUI] = useState({
    assignments: [],
    toastMessage: "",
    viewModes: {},
  });

  // Lấy danh sách assignments từ Firebase
  useEffect(() => {
    const assignmentsRef = ref(db, "assignments");
    const unsubscribe = onValue(assignmentsRef, (snapshot) => {
      const data = snapshot.val();
      setUI((prev) => ({
        ...prev,
        assignments: data ? Object.values(data) : [],
      }));
    });
    return () => unsubscribe();
  }, []);

  // Chuyển đổi giữa chế độ "time" và "day" theo khu vực
  const toggleViewMode = (area, mode) => {
    setUI((prev) => ({
      ...prev,
      viewModes: {
        ...prev.viewModes,
        [area]: mode,
      },
    }));
  };

  const handleToastClose = () => setUI((prev) => ({ ...prev, toastMessage: "" }));

  const getFilteredAssignments = () => {
    return ui.assignments.filter((a) => {
      if (leaderFromUrl) return a.area === leaderFromUrl;
      if (selectedLeader) return a.area === selectedLeader;
      return true;
    });
  };

  return (
    <>
      <div className="font-sans bg-gray-50 pt-6 mx-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 demo">
            {t("employ.title")}
          </h1>
        </div>

        <div className="space-y-8">
          {getFilteredAssignments().map((a) => {
            const key = a.area.replace(/\//g, "_");
            const currentViewMode = ui.viewModes[a.area] || "time";
            return (
              <div key={key} className="border p-4 bg-white rounded shadow">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">
                    {t("employ.leader")}: {a.area}
                  </h2>
                  <div className="flex items-center gap-4">
                    <AddEmployeeForm />
                    <div className="space-x-2">
                      <button
                        onClick={() => toggleViewMode(a.area, "time")}
                        className={`px-4 py-2 rounded font-semibold ${
                          currentViewMode === "time"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-300"
                        }`}
                      >
                        {t("employ.time")}
                      </button>
                      <button
                        onClick={() => toggleViewMode(a.area, "day")}
                        className={`px-4 py-2 rounded font-semibold ${
                          currentViewMode === "day"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-300"
                        }`}
                      >
                        {t("employ.day")}
                      </button>
                    </div>
                  </div>
                </div>
                {currentViewMode === "time" ? (
                  <AreaProductionTableTime area={a.area} showToast={showToast} />
                ) : (
                  <AreaProductionTable area={a.area} showToast={showToast} />
                )}
              </div>
            );
          })}
        </div>

        {/* Toast thông báo */}
        {showToast ? null : (
          <Toast message={ui.toastMessage} onClose={handleToastClose} />
        )}
      </div>
    </>
  );
};

export default Employ;
