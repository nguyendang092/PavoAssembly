import React from "react";

const EmployeeList = ({ date, attendanceData, setAttendanceData, employeeDetails }) => {
  const handleToggle = (employeeId, checked) => {
    setAttendanceData((prev) => {
      const newData = { ...prev };
      if (!newData[employeeId]) newData[employeeId] = {};
      newData[employeeId][date] = checked ? "present" : "leave";
      return newData;
    });
  };

  const getStatus = (employeeId) => {
    return attendanceData[employeeId]?.[date] === "present";
  };

  const presentCount = Object.entries(employeeDetails).filter(
    ([name]) => attendanceData?.[name]?.[date] === "present"
  ).length;

  const absentCount = Object.keys(employeeDetails).length - presentCount;

  return (
    <div>
      <div className="mb-2 text-sm font-medium">
        👥 Tổng: {Object.keys(employeeDetails).length} | ✅ Có mặt: {presentCount} | ❌ Vắng: {absentCount}
      </div>

      <table className="w-full text-sm border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="border px-2 py-1">Tên</th>
            <th className="border px-2 py-1">Tuổi</th>
            <th className="border px-2 py-1">Chức vụ</th>
            <th className="border px-2 py-1">SĐT</th>
            <th className="border px-2 py-1">Đi làm?</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(employeeDetails).map(([name, info], idx) => (
            <tr key={idx} className="hover:bg-gray-100">
              <td className="border px-2 py-1 font-medium">{name}</td>
              <td className="border px-2 py-1 text-center">{info.age}</td>
              <td className="border px-2 py-1 text-center">{info.position}</td>
              <td className="border px-2 py-1 text-center">{info.phone}</td>
              <td className="border px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={getStatus(name)}
                  onChange={(e) => handleToggle(name, e.target.checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeList;
