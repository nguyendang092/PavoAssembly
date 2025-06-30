import { useState, useEffect } from "react";
import { format } from "date-fns";
import Modal from "react-modal";
import SingleMachineTable from "./SingleMachineTable";
import ChartView from "./ChartView";
import { ref, onValue, set, remove, update, get } from "firebase/database";
import { db } from "./firebase";
import { HiHome, HiCalendar, HiFolder } from "react-icons/hi";
import { FaCheck, FaTimes } from "react-icons/fa";
import { FaChartLine, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import Toast from "./Toast";

Modal.setAppElement("#root");

const TemperatureMonitor = () => {
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000); // tự động ẩn sau 3s
  };
  const [editingMachine, setEditingMachine] = useState(null);
  const [editMachineName, setEditMachineName] = useState("");
  // State lưu danh sách khu vực dạng object { areaName: { machines: [] } }
  const [areas, setAreas] = useState({});
  // Khu vực được chọn ở sidebar (mặc định null, chờ user chọn)
  const [selectedArea, setSelectedArea] = useState(null);
  // Tháng hiện tại (format yyyy-MM)
  const [selectedMonth, setSelectedMonth] = useState(() =>
    format(new Date(), "yyyy-MM")
  );
  // Hiển thị danh sách khu vực trên sidebar
  const [showAreas, setShowAreas] = useState(false);
  // Hiển thị input chọn tháng
  const [showMonthInput, setShowMonthInput] = useState(false);
  // Modal biểu đồ
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  // Tab biểu đồ: temperature hoặc humidity
  const [activeTab, setActiveTab] = useState("temperature");
  // Modal chọn khu vực biểu đồ
  const [modalSelectedArea, setModalSelectedArea] = useState(null);
  const [editingArea, setEditingArea] = useState(null);
  const [editAreaName, setEditAreaName] = useState("");
  // Thêm máy
  const [newMachineName, setNewMachineName] = useState("");
  const [isAddingMachine, setIsAddingMachine] = useState(false);
  // --- Lấy dữ liệu realtime của areas từ Firebase ---
  useEffect(() => {
    const areasRef = ref(db, "areas");
    const unsubscribe = onValue(areasRef, (snapshot) => {
      const data = snapshot.val() || {};
      console.log("Firebase areas data:", data);
      setAreas(data);
      // Bỏ không set selectedArea, modalSelectedArea tự động
      // User sẽ click chọn khu vực bên sidebar
    });
    return () => unsubscribe();
  }, []);
  // Lấy danh sách máy trong khu vực được chọn
  const machines =
    selectedArea && areas[selectedArea]?.machines
      ? areas[selectedArea].machines
      : [];
const handleEditMachine = async (oldName, newName) => {
  if (!selectedArea) return;
  const trimmedNew = newName.trim();
  if (!trimmedNew) {
    alert("Tên máy không được để trống");
    return;
  }
  const currentMachines = areas[selectedArea]?.machines || [];
  console.log("Old name:", oldName);
  console.log("New name:", trimmedNew);
  console.log("Current machines:", currentMachines);
  if (oldName === trimmedNew) {
    setEditingMachine(null);
    return;
  }
  if (currentMachines.includes(trimmedNew)) {
    alert("Máy đã tồn tại trong khu vực");
    return;
  }
  try {
    // Update danh sách máy trong khu vực
    const updatedMachines = currentMachines.map((m) =>
      m === oldName ? trimmedNew : m
    );
    console.log("Updated machines list:", updatedMachines);
    await update(ref(db, `areas/${selectedArea}`), {
      machines: updatedMachines,
    });
    console.log("Updated machines list in Firebase");
    // Đổi tên máy trong temperature_monitor
    const oldRef = ref(db, `temperature_monitor/${selectedArea}/${oldName}`);
const newRef = ref(db, `temperature_monitor/${selectedArea}/${trimmedNew}`);
    const snapshot = await get(oldRef);
    console.log("Snapshot exists:", snapshot.exists());
    if (snapshot.exists()) {
      console.log("Old data:", snapshot.val());
      await set(newRef, snapshot.val());
      console.log("Set new key done");
      await remove(oldRef);
      console.log("Removed old key done");
      setEditingMachine(null);
      setEditMachineName("");
      showToast(`Đã đổi tên máy ${oldName} thành ${trimmedNew}`);
    } else {
      console.log("Không tìm thấy dữ liệu nhiệt độ cũ để đổi tên.");
      alert("Không tìm thấy dữ liệu nhiệt độ để đổi tên");
    }
  } catch (error) {
    console.error("Lỗi khi sửa máy:", error);
    alert("Lỗi khi sửa máy. Xem console để biết chi tiết.");
  }
};
  // --- Xóa máy khỏi khu vực ---
  const handleDeleteMachine = async (machineName) => {
    if (!selectedArea) return;
    const confirmed = window.confirm(`Bạn có chắc muốn xóa máy \"${machineName}\" không?`);
    if (!confirmed) return;
    try {
      const currentMachines = areas[selectedArea]?.machines || [];
      const updatedMachines = currentMachines.filter((m) => m !== machineName);
      await update(ref(db, `areas/${selectedArea}`), { machines: updatedMachines });
      await remove(ref(db, `temperature_monitor/${selectedArea}/${machineName}`));
    } catch (error) {
      console.error("Lỗi khi xóa máy:", error);
      alert("Lỗi khi xóa máy. Xem console để biết chi tiết.");
    }
  };
  // --- Bắt đầu sửa ---
  const startEditArea = (areaName) => {
    setEditingArea(areaName);
    setEditAreaName(areaName);
  };
  // --- Lưu sửa khu vực ---
  const handleEditArea = async () => {
    const trimmedName = editAreaName.trim();
    if (!trimmedName) {
      alert("Tên khu vực không được để trống");
      return;
    }
    if (trimmedName !== editingArea && areas[trimmedName]) {
      alert("Khu vực mới đã tồn tại");
      return;
    }
    try {
      const oldMachines = areas[editingArea]?.machines || [];
      await set(ref(db, `areas/${trimmedName}`), { machines: oldMachines });
      await remove(ref(db, `areas/${editingArea}`));

      const oldDataRef = ref(db, `temperature_monitor/${editingArea}`);
      const newDataRef = ref(db, `temperature_monitor/${trimmedName}`);
      const snapshot = await get(oldDataRef);
      if (snapshot.exists()) {
        await set(newDataRef, snapshot.val());
        await remove(oldDataRef);
      }

      setEditingArea(null);
      setEditAreaName("");
      setSelectedArea(trimmedName);
      setModalSelectedArea(trimmedName);
    } catch (error) {
      alert("Lỗi khi sửa khu vực. Xem console để biết chi tiết.");
    }
  };
  // --- Hủy sửa ---
  const cancelEditArea = () => {
    setEditingArea(null);
    setEditAreaName("");
  };
  // --- Xóa khu vực ---
  const handleDeleteArea = async (areaName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khu vực \"${areaName}\" không?`)) return;
    try {
      await remove(ref(db, `areas/${areaName}`));
      await remove(ref(db, `temperature_monitor/${areaName}`));
      if (selectedArea === areaName) {
        setSelectedArea(null);
        setModalSelectedArea(null);
      }
    } catch (error) {
      alert("Lỗi khi xóa khu vực. Xem console để biết chi tiết.");
    }
  };
  // --- Thêm máy mới vào khu vực ---
   const handleAddMachine = async () => {
    const trimmedMachine = newMachineName.trim();
    if (!trimmedMachine) {
      alert("Tên máy không được để trống");
      return;
    }
    if (!selectedArea) {
      alert("Chưa chọn khu vực để thêm máy");
      return;
    }
    const existingMachines = areas[selectedArea]?.machines || [];
    if (existingMachines.includes(trimmedMachine)) {
      alert("Máy đã tồn tại trong khu vực");
      return;
    }
    try {
      const updatedMachines = [...existingMachines, trimmedMachine];
      await update(ref(db, `areas/${selectedArea}`), {
        machines: updatedMachines,
      });
      // Khởi tạo dữ liệu rỗng cho máy trong temperature_monitor
      await set(ref(db, `temperature_monitor/${selectedArea}/${trimmedMachine}`), {});
      setNewMachineName("");
      setIsAddingMachine(false);
    } catch (error) {
      alert("Lỗi khi thêm máy. Hãy liên hệ quản trị viên.");
    }
  };
  
  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-72 h-screen fixed top-0 left-0 bg-gradient-to-b from-indigo-600 to-purple-600 text-white p-6 space-y-6 shadow z-10 overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 bg-white/20 rounded px-3 py-2">
            <HiHome className="text-xl" />
            <span className="font-semibold">Dashboard</span>
          </div>
        </div>
        <div className="space-y-4">
          <p className="uppercase text-sm text-white/70 tracking-wide">
            Bộ lọc
          </p>
          {/* Khu vực */}
          <div>
            <div
              onClick={() => setShowAreas(!showAreas)}
              className="flex items-center space-x-3 hover:bg-white/20 rounded px-3 py-2 cursor-pointer select-none"
            >
              <HiFolder className="text-xl" />
              <span className="font-semibold">Khu vực</span>
              <span className="ml-auto select-none">
                {showAreas ? "▲" : "▼"}
              </span>
            </div>
            {showAreas && (
              <div className="ml-2 mt-2 space-y-2">
                {/* Nếu chưa có khu vực */}
                {Object.keys(areas).length === 0 && (
                  <p className="text-sm text-white/60 italic">
                    Chưa có khu vực nào
                  </p>
                )}
                {Object.keys(areas).map((area) => (
                  <div
                    key={area}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
                      selectedArea === area
                        ? "bg-white/30 font-semibold"
                        : "hover:bg-white/10"
                    }`}
                  >
                    <div
                      className="flex-1"
                      onClick={() => setSelectedArea(area)}
                    >
                      {editingArea === area ? (
                        <input
                          value={editAreaName}
                          onChange={(e) => setEditAreaName(e.target.value)}
                          className="w-full px-2 py-1 rounded text-black"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditArea();
                            else if (e.key === "Escape") cancelEditArea();
                          }}
                        />
                      ) : (
                        <span>{area}</span>
                      )}
                    </div>
                    {/* Nút sửa, xóa */}
                    {editingArea === area ? (
                      <div className="space-x-1">
                        <button
                          onClick={handleEditArea}
                          className="bg-green-600 px-2 py-1 rounded text-white text-sm"
                          title="Lưu"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={cancelEditArea}
                          className="bg-gray-600 px-2 py-1 rounded text-white text-sm"
                          title="Hủy"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEditArea(area)}
                          className="hover:text-green-300"
                          title="Sửa"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteArea(area)}
                          className="hover:text-red-400"
                          title="Xóa"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Chỉ hiện phần máy khi đã chọn khu vực */}
          {selectedArea && (
            <div className="mt-6">
              <p className="uppercase text-sm text-white/70 tracking-wide mb-2">
                Khu vực: {selectedArea}
              </p>
              {machines.length === 0 && (
                <p className="text-sm text-white/60 italic mb-2">
                  Chưa có máy nào
                </p>
              )}
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
                            else if (e.key === "Escape") {
                              setEditingMachine(null);
                              setEditMachineName("");
                            }
                          }}
                          autoFocus
                        />
                        <div className="ml-1">
                          <button
                            onClick={() =>
                              handleEditMachine(machine, editMachineName)
                            }
                            className="text-green-400 hover:text-green-600"
                            title="Lưu"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMachine(null);
                              setEditMachineName("");
                            }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Hủy"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{machine}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              console.log("🟢 Click nút Lưu");
                              setEditingMachine(machine);
                              setEditMachineName(machine);
                            }}
                            className=" hover:text-green-300"
                            title="Sửa tên"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteMachine(machine)}
                            className=" hover:text-red-500"
                            title="Xóa máy"
                          >
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
                    placeholder="Tên máy mới"
                    className="flex-1 px-2 py-1 rounded text-black"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddMachine();
                      else if (e.key === "Escape") {
                        setIsAddingMachine(false);
                        setNewMachineName("");
                      }
                    }}
                  />
                  <button
                    onClick={handleAddMachine}
                    className="bg-indigo-600 px-3 py-1 rounded text-white"
                  >
                    Thêm máy
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingMachine(false);
                      setNewMachineName("");
                    }}
                    className="bg-gray-600 px-3 py-1 rounded text-white"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingMachine(true)}
                  className="flex items-center space-x-1 text-indigo-300 hover:text-indigo-100"
                >
                  <FaPlus />
                  <span>Thêm máy</span>
                </button>
              )}
            </div>
          )}
          {/* Tháng */}
          <div className="mt-6">
            <div
              onClick={() => setShowMonthInput(!showMonthInput)}
              className="flex items-center space-x-3 hover:bg-white/20 rounded px-3 py-2 cursor-pointer select-none"
            >
              <HiCalendar className="text-xl" />
              <span className="font-semibold">Tháng</span>
              <span className="ml-auto select-none">
                {showMonthInput ? "▲" : "▼"}
              </span>
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
          {/* Nút mở popup biểu đồ */}
          <div
            onClick={() => {
              setModalSelectedArea(selectedArea);
              setIsChartModalOpen(true);
            }}
            className="flex items-center space-x-3 hover:bg-white/20 rounded px-3 py-2 cursor-pointer select-none mt-6"
          >
            <FaChartLine className="text-xl" />
            <span className="font-semibold">Xem biểu đồ</span>
          </div>
        </div>
      </div>
      {/* Nội dung chính */}
      <div className="ml-72 flex-1 p-6">
        <div className="bg-white rounded shadow p-6 pt-12 min-h-[500px]">
          <h2 className="text-2xl font-bold text-center mb-6">
            📋 Theo dõi nhiệt độ & độ ẩm - {selectedArea || "Chưa chọn khu vực"}
          </h2>
          {machines.length === 0 ? (
            <p className="text-center text-gray-600">
              Không có máy đo nào trong khu vực này.
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
      {/* Modal Biểu đồ */}
      <Modal
        isOpen={isChartModalOpen}
        onRequestClose={() => setIsChartModalOpen(false)}
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl mx-auto mt-20 overflow-y-auto max-h-[90vh]"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-6">
            <h3 className="text-2xl font-bold">
              📈 Biểu đồ khu vực - {selectedMonth}
            </h3>
            {/* Dropdown chọn khu vực */}
            <select
              value={modalSelectedArea}
              onChange={(e) => setModalSelectedArea(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.keys(areas).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsChartModalOpen(false)}
            className="text-red-600 font-bold hover:text-red-800 transition-colors"
            aria-label="Đóng modal biểu đồ"
          >
            Đóng ✖
          </button>
        </div>
        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab("temperature")}
            className={`px-5 py-2 rounded-md font-semibold border transition-colors duration-200 ${
              activeTab === "temperature"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Nhiệt độ
          </button>
          <button
            onClick={() => setActiveTab("humidity")}
            className={`px-5 py-2 rounded-md font-semibold border transition-colors duration-200 ${
              activeTab === "humidity"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Độ ẩm
          </button>
        </div>
        {/* Biểu đồ */}
        {modalSelectedArea ? (
          <ChartView
            selectedArea={modalSelectedArea}
            selectedMonth={selectedMonth}
            type={activeTab}
            machines={areas[modalSelectedArea]?.machines || []}
          />
        ) : (
          <p>Chưa có khu vực nào được chọn để hiển thị biểu đồ.</p>
        )}
      </Modal>
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </div>
  );
};

export default TemperatureMonitor;
