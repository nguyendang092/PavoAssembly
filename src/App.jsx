import React, { useEffect, useState, useLayoutEffect } from "react";
import Employ from "./Employ";
import Toast from "./Toast";
import Navbar from "./Navbar";
import TemperatureMonitor from "./TemperatureMonitor";
import { FaArrowCircleUp } from "react-icons/fa"; // ✅ Icon mũi tên lên
import "./i18n";
import WorkplaceChart from "./WorkplaceChart";
import ModelProductionChart from "./ModelProductionChart";
import { UserContext } from "./UserContext";
import NGWorkplaceChart from "./NGplaceChart";
import "./App.css"; // ✅ Import CSS để đảm bảo toàn bộ ứng dụng có chiều cao 100%
const App = () => {
  const [toastMessage, setToastMessage] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");
  const [leaderMap, setLeaderMap] = useState({});
  const [isScrolled, setIsScrolled] = useState(false);
  // State user cho đăng nhập
  const [user, setUser] = useState(null);

  // Tự động lấy lại thông tin user nếu còn thời gian đăng nhập
  useEffect(() => {
    const loginData = localStorage.getItem("userLogin");
    if (loginData) {
      const { email, name, expire } = JSON.parse(loginData);
      if (Date.now() < expire) {
        setUser({ email, name });
        // Đăng xuất sau thời gian còn lại
        setTimeout(() => {
          localStorage.removeItem("userLogin");
          setUser(null);
        }, expire - Date.now());
      } else {
        localStorage.removeItem("userLogin");
        setUser(null);
      }
    }
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
  };

 useLayoutEffect(() => {
  window.scrollTo({ top: 0, behavior: "auto" });
}, []);

useEffect(() => {
  const handleScroll = () => {
    setIsScrolled(window.scrollY > 100);
  };
  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div>
        {/* Navbar cố định */}
        <div
          className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
            isScrolled
              ? "bg-white/30 backdrop-blur-md shadow-md"
              : "bg-transparent"
          }`}
        >
          <Navbar
            onSelectLeader={setSelectedLeader}
            onLeaderMapReady={setLeaderMap}
            user={user}
            setUser={setUser}
          />
        </div>

        <div className="pt-16 overflow-hidden">
          {selectedLeader === "nhietdo" ? (
            <TemperatureMonitor />
          ) : selectedLeader === "bieudo" ? (
            <WorkplaceChart />
          ) : selectedLeader === "ng" ? (
            <NGWorkplaceChart />
          ) : selectedLeader === "model" ? (
            <ModelProductionChart />
          ) : (
            <Employ showToast={showToast} selectedLeader={selectedLeader} />
          )}
        </div>

        {/* Toast */}
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* ✅ Nút Back to Top bo tròn, icon đẹp */}
        {isScrolled && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 text-blue-600 hover:text-white bg-white hover:bg-blue-600 rounded-full shadow-lg p-3 transition duration-300"
          >
            <FaArrowCircleUp size={24} />
          </button>
        )}
      </div>
    </UserContext.Provider>
  );
};

export default App;
