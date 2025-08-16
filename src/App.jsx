import React, { useEffect, useState, useLayoutEffect } from "react";
import Employ from "./Employ";
import Toast from "./Toast";
import Navbar from "./Navbar";
import TemperatureMonitor from "./TemperatureMonitor";
import { FaArrowCircleUp } from "react-icons/fa";
import "./i18n";
import WorkplaceChart from "./WorkplaceChart";
import ModelProductionChart from "./ModelProductionChart";
import { UserContext } from "./UserContext";
import NGWorkplaceChart from "./NGWorkplaceChart";
import { useLoading } from "./LoadingContext"; // ✅ Dùng context loading
import CertificateGenerator1 from "./CertificateGenerator1";
import CertificateGenerator2 from "./CertificateGenerator2";
import Metandeco from "./Metandeco"; // ✅ 
import "./App.css";

const App = () => {
  const [toastMessage, setToastMessage] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("sanLuongNormal");
  const [leaderMap, setLeaderMap] = useState({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const { setLoading } = useLoading(); // ✅ Hook loading context

  // Lấy user từ localStorage
  useEffect(() => {
    setLoading(true); // 👈 Bắt đầu loading
    const loginData = localStorage.getItem("userLogin");
    if (loginData) {
      const { email, name, expire } = JSON.parse(loginData);
      if (Date.now() < expire) {
        setUser({ email, name });
        setTimeout(() => {
          localStorage.removeItem("userLogin");
          setUser(null);
        }, expire - Date.now());
      } else {
        localStorage.removeItem("userLogin");
        setUser(null);
      }
    }
    // Nhỏ delay để tránh nháy spinner
    setTimeout(() => setLoading(false), 800);
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

  // Khi chọn tab mới (như "nhietdo", "ng", ...)
  useEffect(() => {
    if (!selectedLeader) return;
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500); // Giả lập load
    return () => clearTimeout(timer);
  }, [selectedLeader]);

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

        {/* Nội dung chính */}
        <div className="pt-16 overflow-hidden">
          {selectedLeader === "nhietdo" ? (
            <TemperatureMonitor />
          ) : selectedLeader === "sanLuongNormal" ? (
            <WorkplaceChart />
          ) : selectedLeader === "sanLuongNG" ? (
            <NGWorkplaceChart />
          ) : selectedLeader === "model" ? (
            <ModelProductionChart />
          ) : selectedLeader === "AP5FF" || selectedLeader === "AP5FZ" ? (
            <Metandeco />
          ) : selectedLeader === "bangKhen1" ? (
            <CertificateGenerator1 />
          ) : selectedLeader === "bangKhen2" ? (
            <CertificateGenerator2 />
          ) : (
            <Employ showToast={showToast} selectedLeader={selectedLeader} />
          )}
        </div>

        {/* Toast */}
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Nút scroll to top */}
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
