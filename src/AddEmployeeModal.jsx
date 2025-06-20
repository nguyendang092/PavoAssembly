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
  weekKey,
  modelList = [],
  setModelList,
  selectedDate,
}) => {
  const getToday = () => new Date().toISOString().slice(0, 10);

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    birthYear: "",
    phone: "",
    status: "Đi làm",
    joinDate: selectedDate || getToday(),
    model: "",
    imageUrl: "",
  });

  const [inputModel, setInputModel] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNewEmployee((prev) => ({
      ...prev,
      joinDate: selectedDate || getToday(),
    }));
  }, [selectedDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee((prev) => ({ ...prev, [name]: value }));
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

    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 512,
      useWebWorker: true,
    };

    const compressedFile = await imageCompression(squareFile, options);

    const storage = getStorage();
    const storageReference = storageRef(storage, `employees/${employeeId}.jpg`);
    await uploadBytes(storageReference, compressedFile);
    const downloadURL = await getDownloadURL(storageReference);
    return downloadURL;
  };

  const generateEmployeeId = async () => {
    const snapshot = await get(ref(db, `attendance/${areaKey}/${weekKey}`));
    const employeeCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
    return `EMP${(employeeCount + 1).toString().padStart(3, "0")}`;
  };

  const handleAddEmployee = async () => {
    const modelValue =
      inputModel.trim() !== "" ? inputModel.trim() : newEmployee.model.trim();

    if (!newEmployee.name.trim() || !modelValue) {
      alert("Vui lòng nhập tên và chọn hoặc nhập line làm việc!");
      return;
    }

    setIsSaving(true);

    try {
      const employeeId = await generateEmployeeId();
      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadImageToStorage(imageFile, employeeId);
      }

      const employeeData = {
        ...newEmployee,
        model: modelValue,
        employeeId,
        imageUrl,
      };

      const newKey = Date.now().toString();
      const employeeRef = ref(db, `attendance/${areaKey}/${weekKey}/${newKey}`);
      await set(employeeRef, employeeData);

      if (!modelList.includes(modelValue)) {
        const updatedModels = [...modelList, modelValue];
        const modelRef = ref(db, `models/${areaKey}`);
        await set(modelRef, updatedModels);
        setModelList(updatedModels);
      }

      setNewEmployee({
        name: "",
        birthYear: "",
        phone: "",
        status: "Đi làm",
        joinDate: selectedDate || getToday(),
        model: "",
        imageUrl: "",
      });
      setInputModel("");
      setImageFile(null);
      setPreviewImage(null);
      onClose();
    } catch (err) {
      console.error("Lỗi khi thêm nhân viên:", err);
      alert("Đã có lỗi khi lưu dữ liệu.");
    }

    setIsSaving(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white rounded-lg p-6 max-w-md mx-auto mt-20 shadow-lg"
      overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start z-50"
    >
      <h2 className="text-xl font-bold mb-4">➕ Thêm phân công</h2>

      <div className="space-y-3">
        {/* Hình ảnh */}
        <div className="text-center">
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="mx-auto h-24 w-24 rounded-full object-cover mb-2"
            />
          )}
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>

        <input
          name="name"
          value={newEmployee.name}
          onChange={handleChange}
          placeholder="Tên nhân viên"
          className="w-full border px-3 py-2 rounded"
        />

        <input
          name="birthYear"
          type="number"
          value={newEmployee.birthYear}
          onChange={handleChange}
          placeholder="Năm sinh"
          className="w-full border px-3 py-2 rounded"
        />

        <input
          name="phone"
          value={newEmployee.phone}
          onChange={handleChange}
          placeholder="Số điện thoại"
          className="w-full border px-3 py-2 rounded"
        />

        <select
          name="status"
          value={newEmployee.status}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
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
          className="w-full border px-3 py-2 rounded"
        >
          <option value="">-- Chọn line làm việc --</option>
          {modelList.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <input
          placeholder="Hoặc nhập line mới"
          className="w-full border px-3 py-2 rounded"
          value={inputModel}
          onChange={(e) => {
            setInputModel(e.target.value);
            if (newEmployee.model !== "")
              setNewEmployee((prev) => ({ ...prev, model: "" }));
          }}
        />

        <input
          name="joinDate"
          type="date"
          value={newEmployee.joinDate}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div className="flex justify-end space-x-2 mt-5">
        <button
          onClick={() => {
            setInputModel("");
            setImageFile(null);
            setPreviewImage(null);
            onClose();
          }}
          className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
          disabled={isSaving}
        >
          Hủy
        </button>
        <button
          onClick={handleAddEmployee}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          disabled={isSaving}
        >
          {isSaving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </Modal>
  );
};

export default AddEmployeeModal; 