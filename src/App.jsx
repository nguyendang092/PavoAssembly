import React, { useEffect, useState } from "react";
import Employ from "./Employ";
import Toast from "./Toast";
import Navbar from "./Navbar";
import TemperatureMonitor from "./TemperatureMonitor";
import "./i18n";

const App = () => {
  const [toastMessage, setToastMessage] = useState("");
  const [selectedLeader, setSelectedLeader] = useState("");
  const [leaderMap, setLeaderMap] = useState({});
  const [isScrolled, setIsScrolled] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div>
      {/* ✅ Navbar cố định */}
      <div
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-white/30 backdrop-blur-md shadow-md" : "bg-transparent"
        }`}
      >
        <Navbar
          onSelectLeader={setSelectedLeader}
          onLeaderMapReady={setLeaderMap}
        />
      </div>

      {/* ✅ Nội dung scroll bình thường */}
      <div className="pt-2">
        {selectedLeader === "nhietdo" ? (
          <TemperatureMonitor />
        ) : (
          <Employ showToast={showToast} selectedLeader={selectedLeader} />
        )}
      </div>

      {/* ✅ Toast luôn hiển thị */}
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </div>
  );
};

export default App;
