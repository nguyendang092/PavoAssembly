import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set, onValue, remove } from "firebase/database";
import AreaProductionTable from './AreaProductionTable'
import Toast from "./Toast";
import Navbar from "./Navbar";

const areas = ["Ngọc Thành", "Chí Thành", "Muội", "Duy Hinh"];
const statuses = [
  "Làm việc",
  "LINE NGƯNG SẢN XUẤT",
  "NGHỈ PHÉP",
  "PHỤ LINE KHÁC",
  "ĐI VỆ SINH",
];

const employeesMaster = [
  { name: "Trần Thị Kim Thủy", image: "nguyenvana.jpg" },
  { name: "Nguyễn Thị Khánh Linh", image: "tranthib.jpg" },
  { name: "Hoàng Thị Minh Thư", image: "tranthib.jpg" },
  { name: "Nguyễn Thị Hoàng Hiếu", image: "tranthib.jpg" },
  { name: "Nguyễn Thị Mỹ Nhân", image: "tranthib.jpg" },
  { name: "Nguyễn Thị Ngọc Nga", image: "tranthib.jpg" },
  { name: "Trần Thị Út Hiệp", image: "tranthib.jpg" },
  { name: "Nguyễn Thị Mỹ Linh", image: "tranthib.jpg" },
  { name: "Trần Thị Phương Dung", image: "tranthib.jpg" },
  { name: "Nguyễn Thanh Thúy", image: "tranthib.jpg" },
  { name: "Đào Thị Tú Anh", image: "tranthib.jpg" },
  { name: "Hoàng Thị Bích Thuận", image: "tranthib.jpg" },
  { name: "Trần Thị Bé Tý", image: "tranthib.jpg" },
  { name: "Quách Văn Hiếu", image: "tranthib.jpg" },
  { name: "Danh Cường", image: "tranthib.jpg" },
  { name: "Lê Thị Dư", image: "tranthib.jpg" },
  { name: "Lê Văn Nhu", image: "tranthib.jpg" },
  { name: "Đại Mạnh Anh", image: "tranthib.jpg" },
  { name: "Lê Kim Hoài Duy Vũ", image: "tranthib.jpg" },
  { name: "Nguyễn Thị Tiến", image: "tranthib.jpg" },
  { name: "Hoàng Lê Thiên Ý", image: "tranthib.jpg" },
  { name: "Nguyễn Thanh Lâm", image: "tranthib.jpg" },
  { name: "Lê Thị La", image: "tranthib.jpg" },
];

const App = () => {
  const [assignments, setAssignments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAreaKey, setEditAreaKey] = useState(null);
  const [formData, setFormData] = useState({ area: "", employees: [] });
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeStatus, setNewEmployeeStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    const assignmentsRef = ref(db, "assignments");
    onValue(assignmentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAssignments(Object.values(data));
      } else {
        setAssignments([]);
      }
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

  const openModalForEdit = (assignment) => {
    setFormData({
      area: assignment.area,
      employees: assignment.employees || [],
    });
    setEditAreaKey(assignment.area.replace(/\//g, "_"));
    setModalOpen(true);
    setErrorMsg("");
  };

  const openModalForNew = () => {
    setFormData({ area: "", employees: [] });
    setEditAreaKey(null);
    setModalOpen(true);
    setErrorMsg("");
  };

  const closeModal = () => {
    setModalOpen(false);
    setErrorMsg("");
  };

  const addEmployee = () => {
    if (!newEmployeeName || !newEmployeeStatus) {
      setErrorMsg("Chọn nhân viên và trạng thái!");
      return;
    }
    const exists = formData.employees.find(
      (emp) => emp.name === newEmployeeName
    );
    if (exists) {
      setErrorMsg("Nhân viên đã tồn tại.");
      return;
    }
    const empInfo = employeesMaster.find((emp) => emp.name === newEmployeeName);
    setFormData({
      ...formData,
      employees: [
        ...formData.employees,
        {
          name: empInfo.name,
          image: empInfo.image,
          status: newEmployeeStatus,
        },
      ],
    });
    setNewEmployeeName("");
    setNewEmployeeStatus("");
    setErrorMsg("");
  };

  const updateEmployeeStatus = (name, status) => {
    setFormData({
      ...formData,
      employees: formData.employees.map((emp) =>
        emp.name === name ? { ...emp, status } : emp
      ),
    });
  };

  const removeEmployee = (name) => {
    setFormData({
      ...formData,
      employees: formData.employees.filter((emp) => emp.name !== name),
    });
  };

  const handleSubmit = () => {
    const key = formData.area.replace(/\//g, "_");

    if (editAreaKey) {
      set(ref(db, `assignments/${key}`), formData)
        .then(() => {
          closeModal();
          showToast("Cập nhật thành công!");
        })
        .catch(() => alert("Lỗi lưu dữ liệu!"));
    } else {
      const assignmentsRef = ref(db, `assignments/${key}`);
      onValue(
        assignmentsRef,
        (snapshot) => {
          const existingData = snapshot.val();

          const mergedEmployees = existingData?.employees
            ? [
                ...existingData.employees,
                ...formData.employees.filter(
                  (emp) =>
                    !existingData.employees.some((e) => e.name === emp.name)
                ),
              ]
            : formData.employees;

          const newData = {
            area: formData.area,
            employees: mergedEmployees,
          };

          set(assignmentsRef, newData)
            .then(() => {
              closeModal();
              showToast("Thêm thành công!");
            })
            .catch(() => alert("Lỗi lưu dữ liệu!"));
        },
        { onlyOnce: true }
      );
    }
  };

  const handleDelete = (area) => {
    if (!window.confirm("Xác nhận xóa phân công?")) return;
    const key = area.replace(/\//g, "_");
    remove(ref(db, `assignments/${key}`))
      .then(() => showToast("Xóa thành công!"))
      .catch(() => alert("Lỗi xóa!"));
  };

  return (
    <>
    <Navbar />
    <div className="p-6 w-screen h-screen font-sans bg-gray-50 overflow-auto"> 
      <div className="flex justify-between items-center mb-2">
<h1 className="text-3xl font-bold mb-6 text-center text-gray-800 demo">
        Bảng phân công & sản lượng
      </h1>
      <div className="text-right">
        <button
          onClick={openModalForNew}
          className="bg-blue-500 text-white px-4 py-2 rounded font-semibold  hover:bg-blue-600"
        >
          + Thêm phân công (+ 배정 추가)
        </button>
      </div>
      </div>
      

      

      <div className="space-y-8">
        {assignments.map((a, idx) => {
          const key = a.area.replace(/\//g, "_");
          return (
            <div key={idx} className="border p-4 bg-white rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">LEADER: {a.area}</h2>
                <div className="space-x-2">
                  <button
                    onClick={() => openModalForEdit(a)}
                    className="bg-yellow-500 text-white hover:bg-yellow-600 px-4 py-1.5 rounded-lg font-semibold shadow transition duration-200"
                  >
                    Sửa (수정)
                  </button>
                  <button
                    onClick={() => handleDelete(a.area)}
                    className="bg-red-500 text-white hover:bg-red-600 px-4 py-1.5 rounded-lg font-semibold shadow transition duration-200"
                  >
                    Xóa (삭제)
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mb-4">
                {a.employees.map((emp) => (
                  <div
                    key={emp.name}
                    className="w-48 h-20 flex items-center border p-2 rounded shadow-sm bg-white"
                  >
                    <img
                      src={`/employees/${emp.image}`}
                      className="w-10 h-10 rounded-full mr-3 object-cover"
                      alt={emp.name}
                    />
                    <div>
                      <div>{emp.name}</div>
                      <div className="text-sm text-gray-500">{emp.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bảng sản lượng */}
              <AreaProductionTable area={a.area} />
            </div>
          );
        })}
      </div>
    

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 animate-fadeInScale">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editAreaKey ? "Chỉnh sửa" : "Thêm mới"} phân công
            </h3>

            {errorMsg && (
              <div className="text-red-600 font-medium mb-2">{errorMsg}</div>
            )}

            {/* Khu vực */}
            <div className="mb-4">
              <label className="block mb-1 font-medium">Khu vực</label>
              <select
                value={formData.area}
                onChange={(e) =>
                  setFormData({ ...formData, area: e.target.value })
                }
                disabled={!!editAreaKey}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn --</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Danh sách nhân viên */}
            <div className="mb-4">
              {formData.employees.map((emp) => (
                <div
                  key={emp.name}
                  className="flex items-center justify-between gap-2 mb-2"
                >
                  <span className="text-gray-700 font-medium">{emp.name}</span>
                  <select
                    value={emp.status}
                    onChange={(e) =>
                      updateEmployeeStatus(emp.name, e.target.value)
                    }
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-blue-400"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeEmployee(emp.name)}
                    className="text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </div>
              ))}

              {/* Thêm nhân viên */}
              <div className="mt-3 flex gap-2">
                <select
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employeesMaster.map((emp) => (
                    <option key={emp.name} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                <select
                  value={newEmployeeStatus}
                  onChange={(e) => setNewEmployeeStatus(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">-- Trạng thái --</option>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  onClick={addEmployee}
                  className="bg-green-600 text-white px-2 py-2 rounded"
                >
                  Thêm
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.area || formData.employees.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </div>
    </>
  );
};

export default App;
