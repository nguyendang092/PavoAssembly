import { useEffect, useState } from "react";

export default function Navbar({ onSelectLeader, onLeaderMapReady }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeLeaderKey, setActiveLeaderKey] = useState("PavoNine_Ngọc Thành");

  const leaderMap = {
    "Nhiệt độ": "nhietdo",
    "PavoNine_Ngọc Thành": "NgocThanh",
    "PavoNine_Chí Thành": "ChiThanh",
    "PavoNine_Muội": "Muoi",
   "PavoNine_Hinh": "DuyHinh",
   
  };
  useEffect(() => {
    if (onLeaderMapReady) {
      onLeaderMapReady(leaderMap);
    }
  }, []);

  useEffect(() => {
    const leader = leaderMap[activeLeaderKey];
    if (onSelectLeader && leader) {
      onSelectLeader(leader);
    }
  }, [activeLeaderKey]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleSelect = (key) => {
    setActiveLeaderKey(key);
  };

  return (
    <nav className="bg-gradient-to-r from-blue-100 via-purple-100 to-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 shadow-md">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a
          href="http://www.pavonine.net/en/"
          className="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <img
            src="/picture/logo/logo_pavo.jpg"
            className="h-10 w-auto rounded-full shadow-md"
            alt="Logo"
          />
        </a>

        {/* Buttons section */}
        <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          <button
            type="button"
            className="text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 shadow-lg transition-all duration-300 hover:scale-105"
          >
            🚀 Get Started
          </button>
          <button
            onClick={toggleMenu}
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-600 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            aria-controls="navbar-cta"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Open main menu</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Navigation menu */}
        <div
          className={`items-center justify-between w-full md:flex md:w-auto md:order-1 transition-all duration-300 ease-in-out ${
            isOpen ? "block animate-fade-in" : "hidden"
          }`}
          id="navbar-cta"
        >
          <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-white shadow-md md:shadow-none md:space-x-6 md:flex-row md:mt-0 md:border-0 md:bg-transparent dark:bg-gray-900">
            {Object.keys(leaderMap).map((key) => (
              <li key={key}>
                <button
                  onClick={() => handleSelect(key)}
                  className={`block py-2 px-4 md:px-3 rounded-md transition-all duration-200 ${
                    key === activeLeaderKey
                      ? "bg-blue-100 text-blue-700 font-semibold underline underline-offset-4"
                      : "text-gray-800 hover:text-blue-600 hover:bg-blue-50"
                  } dark:text-white dark:hover:text-blue-300`}
                >
                  {key}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
