import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function Navbar({ onSelectLeader, onLeaderMapReady }) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(i18n.language || "vi");
  const [activeLeaderKey, setActiveLeaderKey] = useState("temperature");

  const leaderMap = {
    temperature: "nhietdo",
    ngocThanh: "NgocThanh",
    chiThanh: "ChiThanh",
    muoi: "Muoi",
    duyHinh: "DuyHinh",
  };

  useEffect(() => {
    if (onLeaderMapReady) onLeaderMapReady(leaderMap);
  }, []);
  useEffect(() => {
    const leader = leaderMap[activeLeaderKey];
    if (onSelectLeader && leader) onSelectLeader(leader);
  }, [activeLeaderKey]);

  const flagMap = {
    vi: "https://flagcdn.com/w40/vn.png",
    ko: "https://flagcdn.com/w40/kr.png",
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const handleSelect = (key) => setActiveLeaderKey(key);

  const [langPopupOpen, setLangPopupOpen] = useState(false);

  const handleChangeLanguage = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    setLangPopupOpen(false);
  };

  return (
    <nav className="bg-gradient-to-r from-blue-100 via-purple-100 to-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700 shadow-md">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a
          href="http://www.pavonine.net/en/"
          className="flex items-center space-x-3"
        >
          <img
            src="/picture/logo/logo_pavo.jpg"
            className="h-10 w-auto rounded-full shadow-md"
            alt={t("navbar.logoAlt")}
          />
        </a>

        <div className="flex md:order-2 space-x-3 md:space-x-4 items-center relative">
          {/* Language Selector */}
          <button
            onClick={() => setLangPopupOpen(!langPopupOpen)}
            aria-label="Select language"
            title={language === "vi" ? "Tiếng Việt" : "한국어"}
            className="flex items-center space-x-1 cursor-pointer focus:outline-none text-gray-700 dark:text-gray-300"
          >
            <span
              className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-cover bg-center"
              style={{ backgroundImage: `url(${flagMap[language]})` }}
            />
          </button>

          {langPopupOpen && (
            <div className="absolute right-0 mt-10 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex space-x-3 z-50">
              {Object.entries(flagMap).map(([langKey, flagUrl]) => (
                <button
                  key={langKey}
                  onClick={() => handleChangeLanguage(langKey)}
                  title={langKey === "vi" ? "Tiếng Việt" : "한국어"}
                  className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                    language === langKey
                      ? "border-blue-500"
                      : "border-transparent"
                  }`}
                  style={{
                    backgroundImage: `url(${flagUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ))}
            </div>
          )}

          {/* Menu Toggle (Mobile) */}
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

        {/* Navigation Items */}
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
                  className={`block py-2 px-4 md:px-3 rounded-md transition-all duration-200 font-semibold text-xl ${
                    key === activeLeaderKey
                      ? "bg-blue-100 text-blue-700 font-semibold underline underline-offset-4"
                      : "text-gray-800 hover:text-blue-600 hover:bg-blue-50"
                  } dark:text-white dark:hover:text-blue-300`}
                >
                  {t(`navbar.${key}`)} {/* ✅ Đã chỉnh đường dẫn đúng */}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
