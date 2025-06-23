import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, set, onValue, remove } from "firebase/database";
import AreaProductionTable from "./AreaProductionTable";
import Toast from "./Toast";
import Navbar from "./Navbar";
import AreaProductionTableTime from "./AreaProductionTableTime";
import AddEmployeeForm from "./AddEmployeeModal";

const Employ = ({showToast }) => {
  const [assignments, setAssignments] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");
const [isScrolled, setIsScrolled] = useState(false);
  const [viewMode, setViewMode] = useState("time"); // mặc định "time"

  useEffect(() => {
    const handleScroll = () => {
      console.log(window.scroll)
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lấy danh sách assignments
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
    <div
  className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
    isScrolled
      ? "bg-white/30 backdrop-blur-md shadow-md"
      : "bg-transparent"
  }`}
>
  <Navbar onSelectLeader={setSelectedLeader} />
</div>
      <div className="p-6 font-sans bg-gray-50 pt-24">
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
                        Giờ (시간)
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
                    <AreaProductionTableTime area={a.area} showToast={showToast} />
                  ) : (
                    <AreaProductionTable area={a.area} showToast={showToast} />
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
