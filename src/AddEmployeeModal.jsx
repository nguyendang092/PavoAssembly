import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { ref, set, get } from "firebase/database";
import { db } from "./firebase";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import imageCompression from "browser-image-compression";
import { useTranslation } from "react-i18next";

const formatName = (name) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // bỏ thừa khoảng trắng
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
const AddEmployeeModal = ({
  isOpen,
  onClose,
  areaKey,  
  selectedDate, // dạng "YYYY-MM-DD"
  modelList = [],
  setModelList,
}) => {
  const { t } = useTranslation();
  const getToday = () => new Date().toISOString().slice(0, 10);
  const dateKey =
    selectedDate?.replace(/-/g, "") || getToday().replace(/-/g, "");

  const [filterDate, setFilterDate] = useState(selectedDate || "");
  const filterDateKey = filterDate?.replace(/-/g, "") || "";

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    status: "Đi làm",
    joinDate: selectedDate || getToday(),
    model: "",
    imageUrl: "",
    employeeId: "",
  });
  // 2 state riêng cho thời gian phân công từ - đến
  const [timePhanCongFrom, setTimePhanCongFrom] = useState("");
  const [timePhanCongTo, setTimePhanCongTo] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [existingEmployees, setExistingEmployees] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputModel, setInputModel] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFilterDate(selectedDate || getToday());
    setNewEmployee((prev) => ({
      ...prev,
      joinDate: selectedDate || getToday(),
    }));
  }, [selectedDate]);

  useEffect(() => {
    const fetchExisting = async () => {
      const snapshot = await get(ref(db, `attendance/${areaKey}`));
      if (!snapshot.exists()) return setExistingEmployees([]);
      const data = snapshot.val();
      const filtered = Object.entries(data)
        .filter(([_, val]) => val?.schedules?.[filterDateKey])
        .map(([key, val]) => {
          const schedule = val.schedules?.[filterDateKey] || {};
          return {
            key,
            ...val,
            model: schedule.model || "",
            joinDate: schedule.joinDate || filterDate,
            timePhanCong: schedule.timePhanCong || "",
            employeeId: key,
          };
        });
      setExistingEmployees(filtered);
    };
    fetchExisting();
  }, [areaKey, filterDate, filterDateKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee((prev) => {
      // Nếu đang set status = Nghỉ phép thì reset model
      if (name === "status" && value === "Nghỉ phép") {
              setTimePhanCongFrom("");
      setTimePhanCongTo("");
        return { ...prev, [name]: value, model: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const cropToSquare = async (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        );
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: file.type }));
        }, file.type);
      };
    });
  };
  const uploadImageToStorage = async (file, employeeId) => {
    const squareFile = await cropToSquare(file);
    const compressedFile = await imageCompression(squareFile, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 512,
      useWebWorker: true,
    });
    const storage = getStorage();
    const storageReference = storageRef(storage, `employees/${employeeId}.jpg`);
    await uploadBytes(storageReference, compressedFile);
    return await getDownloadURL(storageReference);
  };

  const handleAddOrUpdateEmployee = async () => {
  const name = newEmployee.name.trim();
  const status = newEmployee.status;
  const joinDate = newEmployee.joinDate || selectedDate;
  const modelValue = inputModel.trim() || newEmployee.model.trim();

  // Nếu nghỉ phép: chỉ cần tên và ngày
  if (status === "Nghỉ phép") {
    if (!name || !selectedDate) {
      alert(t("addEmployeeModal.alertLeaveMissing"));
      return;
    }
  } else {
    // Nếu đi làm: cần tên + line + thời gian
    const from = timePhanCongFrom.trim();
    const to = timePhanCongTo.trim();

    if (!name || !modelValue || !selectedDate) {
       alert(t("addEmployeeModal.alertWorkingMissing"));
      return;
    }

    if (!from || !to) {
       alert(t("addEmployeeModal.alertMissingTime"));
      return;
    }
  }

  setIsSaving(true);

  try {
    let employeeId = newEmployee.employeeId;
    if (!employeeId) {
      employeeId = `PAVO${Date.now()}`;
    }

    const employeeRef = ref(db, `attendance/${areaKey}/${employeeId}`);
    const snapshot = await get(employeeRef);
    let existingData = snapshot.exists() ? snapshot.val() : {};

    let imageUrl = existingData.imageUrl || "";
    if (imageFile) {
      imageUrl = await uploadImageToStorage(imageFile, employeeId);
    } else if (previewImage?.startsWith("http")) {
      imageUrl = previewImage;
    }

    const scheduleData = {
      joinDate,
      status,
    };

    if (status === "Đi làm") {
      scheduleData.model = modelValue;
      scheduleData.timePhanCong = `${timePhanCongFrom.trim()} - ${timePhanCongTo.trim()}`;
    }

    const updatedEmployee = {
      name,
      employeeId,
      imageUrl,
      schedules: {
        ...(existingData.schedules || {}),
        [dateKey]: scheduleData,
      },
    };

    await set(employeeRef, updatedEmployee);

    if (status === "Đi làm" && !modelList.includes(modelValue)) {
      const updatedModels = [...modelList, modelValue];
      await set(ref(db, `models/${areaKey}`), updatedModels);
      setModelList(updatedModels);
    }

    resetForm();
    onClose();
  } catch (err) {
    console.error("🔥 Lỗi chi tiết:", err);
     alert(t("addEmployeeModal.saveError", { message: err.message || "" }));
  }
  setIsSaving(false);
};
  const resetForm = () => {
    setSelectedKey(null);
    setNewEmployee({
      name: "",
      status: "Đi làm",
      joinDate: selectedDate || getToday(),
      model: "",
      imageUrl: "",
      employeeId: "",
    });
    setPreviewImage(null);
    setImageFile(null);
    setTimePhanCongFrom("");
    setTimePhanCongTo("");
  };

  const handleSelectEmployee = (emp) => {
    setNewEmployee({
      name: formatName(emp.name || ""),
      status: emp.status || "Đi làm",
      joinDate: filterDate || getToday(),
      model: emp.model || "",
      imageUrl: emp.imageUrl || "",
      employeeId: emp.employeeId || emp.key || "",
    });

    // Nếu có timePhanCong, tách thành from - to
    if (emp.timePhanCong && emp.timePhanCong.includes(" - ")) {
      const [from, to] = emp.timePhanCong.split(" - ");
      setTimePhanCongFrom(from);
      setTimePhanCongTo(to);
    } else {
      setTimePhanCongFrom("");
      setTimePhanCongTo("");
    }

    setPreviewImage(emp.imageUrl || "");
    setSelectedKey(emp.key);
  };

  const filteredEmployees = existingEmployees.filter((emp) =>
    emp.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={() => {
        resetForm();
        onClose();
      }}
      className="bg-white rounded-xl p-8 max-w-4xl mx-auto mt-4 shadow-2xl ring-1 ring-black ring-opacity-5"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
    >
      <h2 className="text-2xl font-extrabold mb-6 text-gray-900">
        {t("addEmployeeModal.title")}
      </h2>

      <div className="mb-3 text-gray-700 text-sm">
        {t("addEmployeeModal.assignDate")}: {" "}
        <strong>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border px-3 py-1 rounded"
          />
        </strong>
      </div>
      <div className="mb-4 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 text-sm bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder={t("addEmployeeModal.searchPlaceholder")}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
        <ul className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          {filteredEmployees.slice(0, 5).map((emp) => (
            <li
              key={emp.key}
              className="cursor-pointer hover:bg-yellow-200 rounded-md px-3 py-1 select-none"
              onClick={() => handleSelectEmployee(emp)}
            >
              <span className="font-semibold">{formatName(emp.name)}</span> -{" "}
              <span className="italic text-gray-600">{emp.model}</span> -{" "}
              <span className="italic text-gray-600">{emp.joinDate}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* <div className="flex justify-center mb-5">
        <img
          src={previewImage}
          alt="Hình ảnh"
          className="h-28 w-28 rounded-full object-cover border-4 border-gradient-to-tr from-blue-400 to-purple-600 shadow-lg"
        />
      </div> */}
      {/* <input
        type="text"
        placeholder="Dán URL hình ảnh"
        value={previewImage || ""}
        onChange={(e) => setPreviewImage(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      /> */}
      <input
        name="name"
        value={newEmployee.name}
        onChange={handleChange}
         placeholder={t("addEmployeeModal.namePlaceholder")}
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />
       {/* Thời gian phân công */}
      <div className="flex gap-2 mb-3 items-center">
        <label className="whitespace-nowrap">{t("addEmployeeModal.assignTime")}</label>
        {["from", "to"].map((type, idx) => {
          const isDisabled = newEmployee.status === "Nghỉ phép";
          const timeValue = type === "from" ? timePhanCongFrom : timePhanCongTo;
          const setTime = type === "from" ? setTimePhanCongFrom : setTimePhanCongTo;

          return (
            <React.Fragment key={type}>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTime(e.target.value)}
                disabled={isDisabled}
                required
                className={`border rounded-md px-3 py-2 transition w-28 ${
                  isDisabled
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                }`}
              />
              {idx === 0 && <span className="mx-1">{t("addEmployeeModal.fromToSeparator")}</span>}
            </React.Fragment>
          );
        })}
      </div>
      <select
        name="status"
        value={newEmployee.status}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      >
        <option value="Đi làm">{t("addEmployeeModal.statusWorking")}</option>
        <option value="Nghỉ phép">{t("addEmployeeModal.statusLeave")}</option>
      </select>
      <select
        name="model"
        value={newEmployee.model}
        onChange={(e) => {
          handleChange(e);
          setInputModel("");
        }}
        disabled={newEmployee.status === "Nghỉ phép"} // disable khi nghỉ phép
        className={`w-full border rounded-md px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
          newEmployee.status === "Nghỉ phép"
            ? "bg-gray-200 cursor-not-allowed"
            : "border-gray-300"
        }`}
      >
        <option value="">{t("addEmployeeModal.selectLinePlaceholder")}</option>
        {modelList.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
      <input
        name="joinDate"
        type="date"
        value={newEmployee.joinDate}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => {
            resetForm();
            onClose();
          }}
          className="px-5 py-2 rounded-md bg-gray-300 hover:bg-gray-400 transition disabled:opacity-50"
          disabled={isSaving}
        >
          {t("addEmployeeModal.cancel")}
        </button>
        <button
          onClick={handleAddOrUpdateEmployee}
          className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? t("addEmployeeModal.saving") : selectedKey ? t("addEmployeeModal.update") : t("addEmployeeModal.saveNew")}
        </button>
      </div>
    </Modal>
  );
};

export default AddEmployeeModal;
