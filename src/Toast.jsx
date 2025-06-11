// Toast.js
import React, { useEffect } from "react";

const Toast = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-5 right-5 bg-black text-white px-4 py-2 rounded shadow-lg z-50 animate-fadeIn">
      {message}
    </div>
  );
};

export default Toast;
