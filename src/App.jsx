import React, { useEffect, useState, useLayoutEffect } from "react";
import Employ from "./Employ";
import Toast from "./Toast";
import Navbar from "./Navbar";
import TemperatureMonitor from "./TemperatureMonitor";
import { FaArrowCircleUp } from "react-icons/fa"; // ✅ Icon mũi tên lên
import "./i18n";
import WorkplaceChart from "./WorkplaceChart";
import ModelProductionChart from "./ModelProductionChart";

const App = () => {
  const [toastMessage, setToastMessage] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");
  const [leaderMap, setLeaderMap] = useState({});
  const [isScrolled, setIsScrolled] = useState(false);

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
        />
      </div>

     <div className="pt-16 overflow-hidden">
    {selectedLeader === "nhietdo" ? (
      <TemperatureMonitor />
    ) : selectedLeader === "bieudo" ? (
      <WorkplaceChart />
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
  );
};

export default App;
