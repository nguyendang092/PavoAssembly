import React, { useState } from "react";
import AddEmployeeModal from "./AddEmployeeModal";
import AttendanceModal from "./AttendanceModal";

const EmployeeManager = ({ modelList }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // <-- Truyền vào AttendanceModal

  const handleAddComplete = (employee) => {
    setSelectedEmployee(employee);  // Lưu lại thông tin mới thêm
    setIsAddOpen(false);
    setIsAttendanceOpen(true);     // Mở modal Attendance ngay sau khi thêm
  };

  return (
    <>
      <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
        ➕ Thêm nhân viên
      </button>

      <AddEmployeeModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        modelList={modelList}
        onAddComplete={handleAddComplete} // 👈 callback sau khi thêm
      />

      <AttendanceModal
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        selectedEmployee={selectedEmployee} // 👈 truyền object vào
      />
    </>
  );
};

export default EmployeeManager;
