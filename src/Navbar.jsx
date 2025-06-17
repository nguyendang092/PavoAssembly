import { useEffect, useState } from "react";

export default function Navbar({ onSelectLeader, onLeaderMapReady }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeLeaderKey, setActiveLeaderKey] = useState("PavoNine_Ngọc Thành");

  const leaderMap = {
    "PavoNine_Ngọc Thành": "Ngọc Thành",
    "PavoNine_Chí Thành": "Chí Thành",
    PavoNine_Muội: "Muội",
    PavoNine_Hinh: "Duy Hinh",
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
    <nav className="bg-white border-gray-200 dark:bg-gray-900">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a
          href="http://www.pavonine.net/en/"
          className="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <img src="/picture/logo/logo_pavo.jpg" className="h-10" alt="Logo" />
        </a>
        <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          <button
            type="button"
            className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
          >
            Get started
          </button>
          <button
            onClick={toggleMenu}
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100"
            aria-controls="navbar-cta"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Open main menu</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 17 14">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 1h15M1 7h15M1 13h15"
              />
            </svg>
          </button>
        </div>
        <div
          className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${
            isOpen ? "" : "hidden"
          }`}
          id="navbar-cta"
        >
          <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-gray-800">
            {Object.keys(leaderMap).map((key) => (
              <li key={key}>
                <button
                  onClick={() => handleSelect(key)}
                  className={`block py-2 px-3 md:p-0 rounded-sm ${
                    key === activeLeaderKey
                      ? "text-blue-700 font-semibold"
                      : "text-gray-900 hover:text-blue-700"
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
