import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, set, onValue, remove } from 'firebase/database';
import './styles/animation.css';
import './styles/notifications.css';
import './App.css';
const areas = ['IACD/MMFD', 'QPDF05', 'WMRT85', 'M90F32'];
const statuses = ['Làm việc', 'LINE NGƯNG SẢN XUẤT', 'NGHỈ PHÉP', 'PHỤ LINE KHÁC', 'ĐI VỆ SINH'];
const timeSlots = ['06:00-08:00', '08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

const employeesMaster = [
  { name: 'Nguyễn Văn A', image: 'nguyenvana.jpg' },
  { name: 'Trần Thị B', image: 'tranthib.jpg' }
];

const App = () => {
  const [assignments, setAssignments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAreaKey, setEditAreaKey] = useState(null);
  const [formData, setFormData] = useState({ area: '', employees: [] });
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeStatus, setNewEmployeeStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [production, setProduction] = useState({});

  useEffect(() => {
    const assignmentsRef = ref(db, 'assignments');
    onValue(assignmentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAssignments(Object.values(data));
      } else {
        setAssignments([]);
      }
    });

    const productionRef = ref(db, 'production');
    onValue(productionRef, (snapshot) => {
      setProduction(snapshot.val() || {});
    });
  }, []);

  const openModalForEdit = (assignment) => {
    setFormData({ area: assignment.area, employees: assignment.employees || [] });
    setEditAreaKey(assignment.area.replace(/\//g, '_'));
    setModalOpen(true);
    setErrorMsg('');
  };

  const openModalForNew = () => {
    setFormData({ area: '', employees: [] });
    setEditAreaKey(null);
    setModalOpen(true);
    setErrorMsg('');
  };

  const closeModal = () => {
    setModalOpen(false);
    setErrorMsg('');
  };

  const validateForm = () => {
    if (!formData.area) return 'Vui lòng chọn khu vực.';
    if (formData.employees.length === 0) return 'Vui lòng thêm nhân viên.';
    for (let emp of formData.employees) {
      if (!emp.status) return `Chọn trạng thái cho ${emp.name}`;
    }
    return '';
  };

  const addEmployee = () => {
    if (!newEmployeeName || !newEmployeeStatus) {
      setErrorMsg('Chọn nhân viên và trạng thái!');
      return;
    }
    const exists = formData.employees.find(emp => emp.name === newEmployeeName);
    if (exists) {
      setErrorMsg('Nhân viên đã tồn tại.');
      return;
    }
    const empInfo = employeesMaster.find(emp => emp.name === newEmployeeName);
    setFormData({
      ...formData,
      employees: [...formData.employees, {
        name: empInfo.name,
        image: empInfo.image,
        status: newEmployeeStatus
      }]
    });
    setNewEmployeeName('');
    setNewEmployeeStatus('');
    setErrorMsg('');
  };

  const updateEmployeeStatus = (name, status) => {
    setFormData({
      ...formData,
      employees: formData.employees.map(emp => emp.name === name ? { ...emp, status } : emp)
    });
  };

  const removeEmployee = (name) => {
    setFormData({
      ...formData,
      employees: formData.employees.filter(emp => emp.name !== name)
    });
  };

  const handleSubmit = () => {
    const err = validateForm();
    if (err) {
      setErrorMsg(err);
      return;
    }
    const key = formData.area.replace(/\//g, '_');
    set(ref(db, `assignments/${key}`), formData)
      .then(() => {
        closeModal();
        showToast('Lưu thành công!');
      })
      .catch(() => alert('Lỗi lưu dữ liệu!'));
  };

  const handleDelete = (area) => {
    if (!window.confirm('Xác nhận xóa phân công?')) return;
    const key = area.replace(/\//g, '_');
    remove(ref(db, `assignments/${key}`))
      .then(() => showToast('Xóa thành công!'))
      .catch(() => alert('Lỗi xóa!'));
  };

  const updateProduction = (area, slot, value) => {
    const key = area.replace(/\//g, '_');
    set(ref(db, `production/${key}/${slot}`), value)
      .then(() => showToast('Cập nhật sản lượng!'))
      .catch(() => alert('Lỗi cập nhật!'));
  };

  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 demo">Quản lý phân công và sản lượng</h1>

      <div className="text-right mb-4">
        <button onClick={openModalForNew} className="bg-blue-600 text-white px-4 py-2 rounded">+ Thêm phân công</button>
      </div>

      <div className="space-y-8">
        {assignments.map((a, idx) => {
          const key = a.area.replace(/\//g, '_');
          return (
            <div key={idx} className="border p-4 bg-white rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">{a.area}</h2>
                <div className="space-x-2">
                  <button onClick={() => openModalForEdit(a)} className="text-yellow-600">Sửa</button>
                  <button onClick={() => handleDelete(a.area)} className="text-red-600">Xóa</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                {a.employees.map(emp => (
                  <div key={emp.name} className="flex items-center border p-2 rounded">
                    <img src={`/employees/${emp.image}`} className="w-10 h-10 rounded-full mr-2" alt={emp.name} />
                    <div>
                      <div>{emp.name}</div>
                      <div className="text-sm text-gray-500">{emp.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bảng sản lượng */}
              <div className="overflow-x-auto">
                <table className="table-auto w-full border text-sm text-center">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="border px-2 py-1">Khung giờ</th>
                      {timeSlots.map(slot => (
                        <th key={slot} className="border px-2 py-1">{slot}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-2 py-1">Sản lượng</td>
                      {timeSlots.map(slot => (
                        <td key={slot} className="border px-2 py-1">
                          <input
                            type="number"
                            value={production[key]?.[slot] || ''}
                            onChange={(e) => updateProduction(a.area, slot, parseInt(e.target.value) || 0)}
                            className="w-full px-1 py-1 text-center border rounded"
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal fadeInScale">
          <div className="modal-content">
            <h3>{editAreaKey ? 'Chỉnh sửa' : 'Thêm mới'} phân công</h3>
            {errorMsg && <div className="error">{errorMsg}</div>}
            <div className="mb-3">
              <label>Khu vực</label>
              <select value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} disabled={!!editAreaKey}>
                <option value="">-- Chọn --</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="mb-3">
              {formData.employees.map(emp => (
                <div key={emp.name} className="flex items-center justify-between mb-1">
                  <span>{emp.name}</span>
                  <select value={emp.status} onChange={(e) => updateEmployeeStatus(emp.name, e.target.value)}>
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => removeEmployee(emp.name)}>Xóa</button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <select value={newEmployeeName} onChange={(e) => setNewEmployeeName(e.target.value)}>
                  <option value="">-- Nhân viên --</option>
                  {employeesMaster.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
                </select>
                <select value={newEmployeeStatus} onChange={(e) => setNewEmployeeStatus(e.target.value)}>
                  <option value="">-- Trạng thái --</option>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={addEmployee}>Thêm</button>
              </div>
            </div>
            <div className="text-right">
              <button onClick={closeModal}>Hủy</button>
              <button onClick={handleSubmit}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;