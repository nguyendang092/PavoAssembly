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

const AddEmployeeModal = ({
  isOpen,
  onClose,
  areaKey,
  selectedDate, // dạng "YYYY-MM-DD"
  modelList = [],
  setModelList,
}) => {
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
        return { ...prev, [name]: value, model: "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
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
    // Ghép chuỗi timePhanCong
    const timePhanCongTrimmedFrom = timePhanCongFrom.trim();
    const timePhanCongTrimmedTo = timePhanCongTo.trim();
    let timePhanCong = "";
    if (timePhanCongTrimmedFrom && timePhanCongTrimmedTo) {
      timePhanCong = `${timePhanCongTrimmedFrom} - ${timePhanCongTrimmedTo}`;
    }

    const modelValue =
      inputModel.trim() !== "" ? inputModel.trim() : newEmployee.model.trim();

    if (!newEmployee.name.trim() || !modelValue || !selectedDate) {
      alert("Vui lòng nhập tên, line và ngày!");
      return;
    }

    if (!timePhanCong) {
      alert("Vui lòng nhập khoảng thời gian phân công (từ giờ - đến giờ)!");
      return;
    }

    setIsSaving(true);

    const schedulesForDate = {
      model: modelValue,
      joinDate: newEmployee.joinDate || selectedDate,
      status: newEmployee.status,
      timePhanCong,
    };

    try {
      let employeeId = newEmployee.employeeId;

      // Nếu chưa có ID → tạo mới
      if (!employeeId) {
        employeeId = `PAVO${Date.now()}`;
      }

      const employeeRef = ref(db, `attendance/${areaKey}/${employeeId}`);
      const employeeSnap = await get(employeeRef);

      let existingData = {};
      if (employeeSnap.exists()) {
        existingData = employeeSnap.val();
        if (existingData.status) {
          delete existingData.status; // Xóa status ngoài schedules
        }
      }

      let imageUrl = existingData.imageUrl || "";
      if (imageFile) {
        imageUrl = await uploadImageToStorage(imageFile, employeeId);
      } else if (previewImage?.startsWith("http")) {
        imageUrl = previewImage;
      }

      const updatedEmployee = {
        name: newEmployee.name,
        employeeId,
        imageUrl,
        schedules: {
          ...(existingData.schedules || {}),
          [dateKey]: {
            model: modelValue,
            joinDate: newEmployee.joinDate || selectedDate,
            status: newEmployee.status,
            timePhanCong,
          },
        },
      };
      await set(employeeRef, updatedEmployee);

      if (!modelList.includes(modelValue)) {
        const updatedModels = [...modelList, modelValue];
        await set(ref(db, `models/${areaKey}`), updatedModels);
        setModelList(updatedModels);
      }

      resetForm();
      onClose();
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("Đã xảy ra lỗi.");
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
      name: emp.name || "",
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
        ➕ Thêm / ✏️ Cập nhật nhân viên
      </h2>

      <div className="mb-3 text-gray-700 text-sm">
        Ngày phân công:{" "}
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
          placeholder="Tìm theo tên..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
        <ul className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
          {filteredEmployees.slice(0, 5).map((emp) => (
            <li
              key={emp.key}
              className="cursor-pointer hover:bg-yellow-200 rounded-md px-3 py-1 select-none"
              onClick={() => handleSelectEmployee(emp)}
            >
              <span className="font-semibold">{emp.name}</span> -{" "}
              <span className="italic text-gray-600">{emp.model}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-center mb-5">
        <img
          src={previewImage}
          alt="Hình ảnh"
          className="h-28 w-28 rounded-full object-cover border-4 border-gradient-to-tr from-blue-400 to-purple-600 shadow-lg"
        />
      </div>

      <input
        type="text"
        placeholder="Dán URL hình ảnh"
        value={previewImage || ""}
        onChange={(e) => setPreviewImage(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />

      <input
        name="name"
        value={newEmployee.name}
        onChange={handleChange}
        placeholder="Tên nhân viên"
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />

      {/* Khoảng thời gian phân công */}
      <div className="flex gap-2 mb-3 items-center">
        <label className="whitespace-nowrap">Thời gian phân công:</label>
        <input
          type="time"
          value={timePhanCongFrom}
          onChange={(e) => setTimePhanCongFrom(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          required
        />
        <span className="mx-1">-</span>
        <input
          type="time"
          value={timePhanCongTo}
          onChange={(e) => setTimePhanCongTo(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          required
        />
      </div>

      <select
        name="status"
        value={newEmployee.status}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded-md px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      >
        <option value="Đi làm">Đi làm</option>
        <option value="Nghỉ phép">Nghỉ phép</option>
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
        <option value="">-- Chọn line --</option>
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
          Hủy
        </button>
        <button
          onClick={handleAddOrUpdateEmployee}
          className="px-5 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? "Đang lưu..." : selectedKey ? "Cập nhật" : "Lưu mới"}
        </button>
      </div>
    </Modal>
  );
};

export default AddEmployeeModal;
