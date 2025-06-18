import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set, onValue, remove } from "firebase/database";
import AreaProductionTable from "./AreaProductionTable";
import Toast from "./Toast";
import Navbar from "./Navbar";
import AreaProductionTableTime from "./AreaProductionTableTime";
import AddEmployeeForm from "./AddEmployeeModal";

const Employ = () => {
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
  const [assignments, setAssignments] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");

  const [viewMode, setViewMode] = useState("time"); // mặc định "time"

  const [isModalOpen, setIsModalOpen] = useState(false);
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
  }, []);

  return (
    <>
      <Navbar onSelectLeader={setSelectedLeader} />
      <div className="p-6 w-screen h-screen font-sans bg-gray-50 overflow-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 demo">
            Bảng phân công & sản lượng
          </h1>
        </div>

        <div className="space-y-8">
          {assignments
            .filter((a) => !selectedLeader || a.area === selectedLeader)
            .map((a, idx) => {
              const key = a.area.replace(/\//g, "_");
              return (
                <div key={idx} className="border p-4 bg-white rounded shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold">LEADER: {a.area}</h2>
                    <AddEmployeeForm />
                    <div className="space-x-2">
                      {/* Nút chọn hiển thị theo giờ hoặc ngày */}
                      <button
                        onClick={() => setViewMode("time")}
                        className={`px-4 py-2 rounded font-semibold ${
                          viewMode === "time"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-300"
                        }`}
                      >
                        Giờ (시간별)
                      </button>
                      <button
                        onClick={() => setViewMode("day")}
                        className={`px-4 py-2 rounded font-semibold ${
                          viewMode === "day"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-300"
                        }`}
                      >
                        Ngày (날짜)
                      </button>
                    </div>
                  </div>

                  {/* Hiển thị bảng theo viewMode */}
                  {viewMode === "time" ? (
                    <AreaProductionTableTime area={a.area} />
                  ) : (
                    <AreaProductionTable area={a.area} />
                  )}
                </div>
              );
            })}
        </div>

        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      </div>
    </>
  );
};

export default Employ;
