import Employ from "./Employ";
import Toast from "./Toast";
import React, { useEffect, useState } from "react";

const App = () => {
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message) => {
    setToastMessage(message);
  };
  return (
    <div>
      <Employ showToast={showToast} />
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
    </div>
  );
};

export default App;