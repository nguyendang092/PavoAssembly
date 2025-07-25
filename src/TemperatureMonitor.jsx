import { useState, useEffect } from "react";
import { format } from "date-fns";
import Modal from "react-modal";
import { ref, onValue, set, remove, update, get } from "firebase/database";
import { db } from "./firebase";
import { HiHome, HiCalendar, HiFolder } from "react-icons/hi";
import {
  FaCheck,
  FaTimes,
  FaChartLine,
  FaPlus,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import Toast from "./Toast";
import SingleMachineTable from "./SingleMachineTable";
import ChartView from "./ChartView";
import { useTranslation } from "react-i18next";

Modal.setAppElement("#root");

const TemperatureMonitor = () => {
  const { t } = useTranslation();

  const [toastMessage, setToastMessage] = useState("");
  const [editingMachine, setEditingMachine] = useState(null);
  const [editMachineName, setEditMachineName] = useState("");
  const [areas, setAreas] = useState({});
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    format(new Date(), "yyyy-MM")
  );
  const [showAreas, setShowAreas] = useState(false);
  const [showMonthInput, setShowMonthInput] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("temperature");
  const [modalSelectedArea, setModalSelectedArea] = useState(null);
  const [editingArea, setEditingArea] = useState(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [newMachineName, setNewMachineName] = useState("");
  const [isAddingMachine, setIsAddingMachine] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
  const areasRef = ref(db, "areas");
  const unsubscribe = onValue(areasRef, (snapshot) => {
    const data = snapshot.val() || {};
    setAreas(data);
  });
  return () => unsubscribe();
}, []);
  
  const machines =
    selectedArea && areas[selectedArea]?.machines
      ? areas[selectedArea].machines
      : [];

  const handleEditMachine = async (oldName, newName) => {
    const trimmedNew = newName.trim();
    if (!selectedArea || !trimmedNew) return;

    const currentMachines = areas[selectedArea]?.machines || [];
    if (oldName === trimmedNew) {
      setEditingMachine(null);
      return;
    }
    if (currentMachines.includes(trimmedNew)) {
      alert(t("temperatureMonitor.machineExists"));
      return;
    }
    try {
      const updatedMachines = currentMachines.map((m) =>
        m === oldName ? trimmedNew : m
      );
      await update(ref(db, `areas/${selectedArea}`), {
        machines: updatedMachines,
      });

      const oldRef = ref(db, `temperature_monitor/${selectedArea}/${oldName}`);
      const newRef = ref(
        db,
        `temperature_monitor/${selectedArea}/${trimmedNew}`
      );
      const snapshot = await get(oldRef);
      if (snapshot.exists()) {
        await set(newRef, snapshot.val());
        await remove(oldRef);
        setEditingMachine(null);
        setEditMachineName("");
        showToast(
          t("temperatureMonitor.renamed", { oldName, newName: trimmedNew })
        );
      } else {
        alert(t("temperatureMonitor.dataNotFound"));
      }
    } catch (error) {
      alert(t("temperatureMonitor.editError"));
      console.error(error);
    }
  };

  const handleDeleteMachine = async (machineName) => {
    if (!selectedArea) return;
    if (!window.confirm(t("temperatureMonitor.confirmDelete", { machineName })))
      return;

    try {
      const updatedMachines = areas[selectedArea]?.machines.filter(
        (m) => m !== machineName
      );
      await update(ref(db, `areas/${selectedArea}`), {
        machines: updatedMachines,
      });
      await remove(
        ref(db, `temperature_monitor/${selectedArea}/${machineName}`)
      );
    } catch (error) {
      alert(t("temperatureMonitor.deleteError"));
    }
  };

  const handleAddMachine = async () => {
    const trimmedMachine = newMachineName.trim();
    if (!trimmedMachine || !selectedArea) return;

    const existingMachines = areas[selectedArea]?.machines || [];
    if (existingMachines.includes(trimmedMachine)) {
      alert(t("temperatureMonitor.machineExists"));
      return;
    }

    try {
      const updatedMachines = [...existingMachines, trimmedMachine];
      await update(ref(db, `areas/${selectedArea}`), {
        machines: updatedMachines,
      });
      await set(
        ref(db, `temperature_monitor/${selectedArea}/${trimmedMachine}`),
        {}
      );
      setNewMachineName("");
      setIsAddingMachine(false);
    } catch (error) {
      alert(t("temperatureMonitor.addError"));
    }
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-72 h-screen fixed top-0 left-0 bg-gradient-to-b from-indigo-600 to-purple-600 text-white p-6 space-y-6 shadow z-10 overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 bg-white/20 rounded">
            <HiHome className="text-xl" />
            <span className="font-semibold">
              {t("temperatureMonitor.dashboard")}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="uppercase text-sm text-white tracking-wide pt-2">
            {t("temperatureMonitor.filters")}
          </p>

          {/* Area toggle */}
          <div>
            <div
              onClick={() => setShowAreas(!showAreas)}
              className="flex items-center space-x-3 hover:bg-white/20 rounded px-3 py-2 cursor-pointer"
            >
              <HiFolder className="text-xl" />
              <span className="font-semibold">
                {t("temperatureMonitor.area")}
              </span>
              <span className="ml-auto">{showAreas ? "▲" : "▼"}</span>
            </div>
            {showAreas && (
              <div className="ml-2 mt-2 space-y-2">
                {Object.keys(areas).length === 0 && (
                  <p className="text-sm text-white/60 italic">
                    {t("temperatureMonitor.noArea")}
                  </p>
                )}
                {Object.keys(areas).map((areaKey) => (
                  <div
                    key={areaKey}
                    className={`px-2 py-1 rounded cursor-pointer ${
                      selectedArea === areaKey
                        ? "bg-white/30 font-semibold"
                        : "hover:bg-white/10"
                    }`}
                    onClick={() => setSelectedArea(areaKey)}
                  >
                    {t(`areas.${areaKey}`)} {/* ✅ hiển thị tên đã dịch */}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Máy đo */}
          {selectedArea && (
            <div className="mt-6">
              <p className="uppercase text-sm text-white/70 tracking-wide mb-2">
                {t("temperatureMonitor.area")}: {t(`areas.${selectedArea}`)}
              </p>
              <ul className="space-y-1">
                {machines.map((machine) => (
                  <li
                    key={machine}
                    className="flex items-center justify-between bg-white/10 px-2 py-1 rounded"
                  >
                    {editingMachine === machine ? (
                      <>
                        <input
                          value={editMachineName}
                          onChange={(e) => setEditMachineName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded text-black"
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleEditMachine(machine, editMachineName);
                            if (e.key === "Escape") setEditingMachine(null);
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() =>
                            handleEditMachine(machine, editMachineName)
                          }
                        >
                          <FaCheck />
                        </button>
                      </>
                    ) : (
                      <>
                        <span>
                          {t(`machineNames.${machine}`, {
                            defaultValue: machine,
                          })}
                        </span>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingMachine(machine);
                              setEditMachineName(machine);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button onClick={() => handleDeleteMachine(machine)}>
                            <FaTrash />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {isAddingMachine ? (
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={newMachineName}
                    onChange={(e) => setNewMachineName(e.target.value)}
                    placeholder={t("temperatureMonitor.newMachine")}
                    className="flex-1 px-2 py-1 rounded text-black"
                  />
                  <button onClick={handleAddMachine}>
                    {t("temperatureMonitor.add")}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingMachine(false);
                      setNewMachineName("");
                    }}
                  >
                    {t("temperatureMonitor.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingMachine(true)}
                  className="flex items-center space-x-1 text-indigo-300 hover:text-indigo-100"
                >
                  <FaPlus />
                  <span>{t("temperatureMonitor.addMachine")}</span>
                </button>
              )}
            </div>
          )}

          {/* Chọn tháng */}
          <div className="mt-6">
            <div
              onClick={() => setShowMonthInput(!showMonthInput)}
              className="flex items-center space-x-3 hover:bg-white/20 rounded px-3 py-2 cursor-pointer"
            >
              <HiCalendar className="text-xl" />
              <span className="font-semibold">
                {t("temperatureMonitor.month")}
              </span>
              <span className="ml-auto">{showMonthInput ? "▲" : "▼"}</span>
            </div>
            {showMonthInput && (
              <div className="ml-6 mt-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-2 py-1 rounded text-black"
                />
              </div>
            )}
          </div>

          {/* Nút biểu đồ */}
          <div
            onClick={() => {
              setModalSelectedArea(selectedArea);
              setIsChartModalOpen(true);
            }}
            className="flex items-center space-x-3 hover:bg-white/20 rounded px-3 py-2 cursor-pointer mt-6"
          >
            <FaChartLine className="text-xl" />
            <span className="font-semibold">
              {t("temperatureMonitor.viewChart")}
            </span>
          </div>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="ml-72 flex-1 p-6">
        <div className="bg-white rounded shadow p-6 pt-12 min-h-[500px]">
          <h2 className="text-2xl font-bold text-center mb-6">
            📋 {t("temperatureMonitor.header")} -{" "}
            {selectedArea
              ? t(`areas.${selectedArea}`)
              : t("temperatureMonitor.noArea")}
          </h2>

          {machines.length === 0 ? (
            <p className="text-center text-gray-600">
              {t("temperatureMonitor.noMachine")}
            </p>
          ) : (
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              {machines.map((machine) => (
                <div key={machine} className="overflow-x-auto">
                  <SingleMachineTable
                    machine={machine}
                    selectedMonth={selectedMonth}
                    showToast={showToast}
                    area={selectedArea}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal biểu đồ */}
      <Modal
        isOpen={isChartModalOpen}
        onRequestClose={() => setIsChartModalOpen(false)}
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl mx-auto mt-20 overflow-y-auto max-h-[90vh]"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-6">
            <h3 className="text-2xl font-bold">
              📈 {t("temperatureMonitor.chartTitle")} - {selectedMonth}
            </h3>
            <select
              value={modalSelectedArea}
              onChange={(e) => setModalSelectedArea(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.keys(areas).map((areaKey) => (
                <option key={areaKey} value={areaKey}>
                  {t(`areas.${areaKey}`)}{" "}
                  {/* ✅ dịch tên hiển thị, nhưng giữ key gốc làm value */}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsChartModalOpen(false)}
            className="text-red-600 font-bold hover:text-red-800"
          >
            {t("temperatureMonitor.close")} ✖
          </button>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab("temperature")}
            className={`px-5 py-2 rounded-md font-semibold border ${
              activeTab === "temperature"
                ? "bg-indigo-600 text-white"
                : "border-gray-300 text-gray-700"
            }`}
          >
            {t("temperatureMonitor.temperature")}
          </button>
          <button
            onClick={() => setActiveTab("humidity")}
            className={`px-5 py-2 rounded-md font-semibold border ${
              activeTab === "humidity"
                ? "bg-indigo-600 text-white"
                : "border-gray-300 text-gray-700"
            }`}
          >
            {t("temperatureMonitor.humidity")}
          </button>
        </div>

        {modalSelectedArea ? (
          <ChartView
            selectedArea={modalSelectedArea}
            selectedMonth={selectedMonth}
            type={activeTab}
            machines={areas[modalSelectedArea]?.machines || []}
          />
        ) : (
          <p>{t("temperatureMonitor.noChartArea")}</p>
        )}
      </Modal>

      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </div>
  );
};

export default TemperatureMonitor;
