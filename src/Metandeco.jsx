import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { db } from "./firebase";
import { ref, set, get } from "firebase/database";

function Metandeco() {
  const [data, setData] = useState([]);
  const [allLoiKeys, setAllLoiKeys] = useState([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterArena, setFilterArena] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Lấy dữ liệu từ Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const dbRef = ref(db, "AP5");
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
          const rows = [];
          const loiKeySet = new Set();
          const ap5Obj = snapshot.val();
          Object.entries(ap5Obj).forEach(([ap5Value, arenas]) => {
            Object.entries(arenas).forEach(([arena, thangObj]) => {
              Object.entries(thangObj).forEach(([thang, namObj]) => {
                Object.entries(namObj).forEach(([nam, khungGioObj]) => {
                  Object.entries(khungGioObj).forEach(([khungGio, payload]) => {
                    let loiObj = (payload["Lỗi"] && typeof payload["Lỗi"] === "object") ? payload["Lỗi"] : {};
                    Object.keys(loiObj).forEach((k) => loiKeySet.add(k));
                    rows.push({
                      AP5: ap5Value,
                      Arena: arena,
                      "Tháng": thang,
                      "Năm": nam,
                      "Khung giờ": khungGio,
                      "Ngày": payload["Ngày"] || "",
                      "Tháng Năm": payload["Tháng Năm"] || (thang + "/" + nam),
                      "Sản lượng": payload["Sản lượng"] || 0,
                      "Sản lượng NG": payload["Sản lượng NG"] || 0,
                      "% Hiệu suất": payload["% Hiệu suất"] || "",
                      Lỗi: loiObj
                    });
                  });
                });
              });
            });
          });
          setData(rows);
          // Nếu chưa có allLoiKeys (chưa upload file Excel), lấy từ dữ liệu Firebase
          if (loiKeySet.size > 0) setAllLoiKeys(Array.from(loiKeySet));
        } else {
          setData([]);
        }
      } catch (err) {
        console.error("Lỗi lấy dữ liệu từ Firebase:", err);
        setData([]);
      }
    };
    fetchData();
  }, []);

  // Upload Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: 0 });

      // Lấy header gốc
      const headerRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];

      // Gom tất cả các cột không phải thông tin mặc định vào object "Lỗi"
      const defaultKeys = [
        "AP5", "AP5FF", "AP5FZ", "Hàng AP5FF", "Arena", "Ngày", "Tháng", "Năm", "Khung giờ", "Sản lượng", "Sản lượng NG", "% Hiệu suất", "Tháng Năm"
      ];
      function normalizeKey(key) {
        return String(key)
          .replace(/[.#$\[\]/]/g, "_")
          .replace(/\s+/g, " ")
          .replace(/\n|\r|\t/g, " ")
          .trim();
      }

      // Lấy allLoiKeys từ header (sau khi normalize)
      const loiKeysFromHeader = headerRaw
        .filter((key) => key && !defaultKeys.includes(String(key).trim()))
        .map((key) => normalizeKey(key));
      setAllLoiKeys(loiKeysFromHeader);

      // Thêm cột "Tháng Năm" dựa vào cột "Ngày"
      jsonData = jsonData.map((row) => {
        let ngay = row["Ngày"];
        if (typeof ngay === "number") {
          const date = XLSX.SSF.parse_date_code(ngay);
          if (date) {
            ngay = `${String(date.d).padStart(2, "0")}/${String(date.m).padStart(2, "0")}/${date.y}`;
          }
        } else if (typeof ngay === "string") {
          if (/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
            const [y, m, d] = ngay.split("-");
            ngay = `${d}/${m}/${y}`;
          }
        }
        let thangNam = "";
        if (ngay && typeof ngay === "string" && ngay.includes("/")) {
          const parts = ngay.split("/");
          if (parts.length === 3) thangNam = `${parts[1]}/${parts[2]}`;
        }
        // Chuẩn hóa lỗi cho từng dòng
        const loiPayload = {};
        Object.keys(row).forEach((key) => {
          if (!defaultKeys.includes(key)) {
            const normKey = normalizeKey(key);
            loiPayload[normKey] = Number(row[key] || 0);
          }
        });
        return { ...row, "Ngày": ngay, "Tháng Năm": thangNam, "Lỗi": loiPayload };
      });

      setData(jsonData);
    };
    reader.readAsBinaryString(file);
  };

  // Upload lên Firebase
  const uploadToFirebase = async () => {
    try {
      for (const row of data) {
        const ap5Key = Object.keys(row).find(
          (k) =>
            k.toLowerCase() === "ap5" ||
            k.toLowerCase() === "ap5ff" ||
            k.toLowerCase() === "ap5fz" ||
            k.toLowerCase() === "hàng ap5ff"
        );
        const ap5Value = row[ap5Key] || "Unknown";
        const arena = row["Arena"] || "Unknown";
        const khungGio = row["Khung giờ"] || "Unknown";
        const thangNam = row["Tháng Năm"] || "";

        const loiPayload = row["Lỗi"] || {};
        const sanLuongNG = Object.values(loiPayload).reduce(
          (sum, val) => sum + val,
          0
        );
        const sanLuong = Number(row["Sản lượng"] || 0);
        const total = sanLuong + sanLuongNG;
        const hieuSuat =
          total > 0 ? ((sanLuong / total) * 100).toFixed(2) + "%" : "0%";

        const payload = {
          "Sản lượng": sanLuong,
          "Sản lượng NG": sanLuongNG,
          "% Hiệu suất": hieuSuat,
          "Lỗi": loiPayload,
          "Tháng Năm": thangNam,
          "Ngày": row["Ngày"] || "",
        };

        // Đổi path: dùng Tháng Năm thay cho Ngày
        const dataRef = ref(db, `AP5/${ap5Value}/${arena}/${thangNam}/${khungGio}/`);
        await set(dataRef, payload); // Ghi đè dữ liệu mới lên dữ liệu cũ
      }
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (err) {
      console.error("Lỗi upload:", err);
    }
  };

  // allLoiKeys lấy từ header file Excel, luôn đầy đủ các cột lỗi

  // Lấy danh sách tháng/năm và arena duy nhất từ data
  const monthOptions = Array.from(new Set(data.map(row => row['Tháng Năm']).filter(Boolean)));
  const arenaOptions = Array.from(new Set(data.map(row => row['Arena']).filter(Boolean)));

  // Lọc dữ liệu theo tháng và arena
  const filteredData = data.filter(row => {
    return (!filterMonth || row['Tháng Năm'] === filterMonth) && (!filterArena || row['Arena'] === filterArena);
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Sidebar */}
      <div style={{
        width: 280,
        background: 'linear-gradient(180deg, #1e293b 0%, #64748b 100%)',
        color: '#fff',
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        boxShadow: '2px 0 16px 0 rgba(30,41,59,0.08)',
        borderTopRightRadius: 24,
        borderBottomRightRadius: 24,
        minHeight: '100vh',
      }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 32, letterSpacing: 1 }}>Dashboard - AP5FF & AP5FZ</h2>
        {/* Bộ lọc Tháng Năm */}
        <label style={{marginBottom: 6, fontWeight: 500, fontSize: 15, marginTop: 8}}>Lọc theo Tháng/Năm</label>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{marginBottom: 14, width: '100%', padding: 7, borderRadius: 7, fontSize: 15, border: 'none', color: '#1e293b'}}>
          <option value="">Tất cả</option>
          {monthOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {/* Bộ lọc Arena */}
        <label style={{marginBottom: 6, fontWeight: 500, fontSize: 15}}>Lọc theo Arena</label>
        <select value={filterArena} onChange={e => setFilterArena(e.target.value)} style={{marginBottom: 18, width: '100%', padding: 7, borderRadius: 7, fontSize: 15, border: 'none', color: '#1e293b'}}>
          <option value="">Tất cả</option>
          {arenaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <div style={{flex: 1}}></div>
        {/* Upload file và nút upload đặt dưới cùng sidebar - style sang trọng */}
        <div style={{
          width: '100%',
          background: 'rgba(255,255,255,0.10)',
          borderRadius: 16,
          padding: '18px 16px 14px 16px',
          boxShadow: '0 2px 12px 0 rgba(30,41,59,0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 0
        }}>
          <label htmlFor="excel-upload" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 15,
            color: '#fff',
            marginBottom: 10,
            letterSpacing: 0.5,
            cursor: 'pointer',
            userSelect: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            background: 'linear-gradient(90deg, #64748b 0%, #1e293b 100%)',
            boxShadow: '0 1px 4px 0 rgba(30,41,59,0.10)'
          }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect width="20" height="20" rx="4" fill="#0ea5e9"/><path d="M6.5 10.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Chọn file
          </label>
          <input id="excel-upload" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{
            display: 'none'
          }} />
          <button onClick={uploadToFirebase} style={{
            background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 0',
            width: '100%',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 2px 8px 0 rgba(30,41,59,0.13)',
            cursor: 'pointer',
            marginTop: 8,
            marginBottom: 0,
            letterSpacing: 0.5,
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
            onMouseOver={e => {e.currentTarget.style.background='linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)';e.currentTarget.style.boxShadow='0 4px 16px 0 rgba(30,41,59,0.18)';}}
            onMouseOut={e => {e.currentTarget.style.background='linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)';e.currentTarget.style.boxShadow='0 2px 8px 0 rgba(30,41,59,0.13)';}}
          >
            <span style={{display:'inline-flex',alignItems:'center',gap:7}}>
              <svg width="18" height="18" fill="none" viewBox="0 0 20 20" style={{marginRight:2}}><path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="15" width="14" height="2" rx="1" fill="#fff"/></svg>
              Upload
            </span>
          </button>
        </div>
        <div style={{fontSize: 13, opacity: 0.7, marginTop: 16}}>© {new Date().getFullYear()} PavoAssembly</div>
      </div>
      {/* Main content */}
      <div style={{ flex: 1, padding: '36px 32px 32px 32px' }}>
        {uploadSuccess && (
          <div style={{background: '#22c55e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 18, fontWeight: 600, fontSize: 16, textAlign: 'center', boxShadow: '0 2px 8px 0 rgba(34,197,94,0.10)'}}>Upload lên Firebase thành công!</div>
        )}
        {filteredData.length > 0 && (
          <div style={{overflowX: 'auto', marginTop: 0, borderRadius: 12, border: '1px solid #cbd5e1', background: '#f8fafc'}}>
            <table
              style={{
                minWidth: 1100,
                borderCollapse: "separate",
                borderSpacing: 0,
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 12px 0 rgba(30,41,59,0.08)",
                fontFamily: 'Segoe UI, Arial, sans-serif',
                fontSize: 14,
                margin: 0,
                width: '100%'
              }}
            >
              <thead>
                <tr style={{background: 'linear-gradient(90deg, #334155 0%, #64748b 100%)', borderBottom: '2px solid #2563eb'}}>
                  <th style={{
                    color: '#fff',
                    padding: '7px 9px',
                    fontWeight: 700,
                    fontSize: 12,
                    borderTopLeftRadius: 12,
                    textAlign: 'center',
                    position: 'sticky',
                    left: 0,
                    background: 'inherit',
                    zIndex: 2,
                    borderRight: '1px solid #64748b',
                    textTransform: 'uppercase',
                  }}>AP5</th>
                  <th style={{color: '#fff', padding: '7px 9px', fontWeight: 700, fontSize: 12, textAlign: 'center', borderRight: '1px solid #64748b', textTransform: 'uppercase'}}>Arena</th>
                  <th style={{color: '#fff', padding: '7px 9px', fontWeight: 700, fontSize: 12, textAlign: 'center', borderRight: '1px solid #64748b', textTransform: 'uppercase'}}>Tháng</th>
                  <th style={{color: '#fff', padding: '7px 9px', fontWeight: 700, fontSize: 12, textAlign: 'center', borderRight: '1px solid #64748b', textTransform: 'uppercase'}}>Năm</th>
                  <th style={{color: '#fff', padding: '7px 9px', fontWeight: 700, fontSize: 10, textAlign: 'center', borderRight: '1px solid #64748b', textTransform: 'uppercase'}}>Khung giờ</th>
                  <th style={{color: '#fff', padding: '7px 9px', fontWeight: 700, fontSize: 10, textAlign: 'center', borderRight: '1px solid #64748b', textTransform: 'uppercase'}}>Tổng sản lượng</th>
                  <th style={{color: '#fff', padding: '7px 9px', fontWeight: 700, fontSize: 10, textAlign: 'center', borderRight: '1px solid #64748b', textTransform: 'uppercase'}}>Sản lượng NG</th>
                  <th style={{color: '#fff', padding: '7px 9px', fontWeight: 700, fontSize: 10, textAlign: 'center', borderRight: '1px solid #64748b', textTransform: 'uppercase'}}>% Hiệu suất</th>
                  {allLoiKeys.map((loi, i) => (
                    <th key={loi} style={{
                      color: '#fff',
                      padding: '7px 9px',
                      fontWeight: 700,
                      fontSize: 10,
                      textAlign: 'center',
                      borderRight: i === allLoiKeys.length-1 ? undefined : '1px solid #64748b',
                      textTransform: 'uppercase',
                      ...(i === allLoiKeys.length-1 ? {borderTopRightRadius: 12} : {})
                    }}>{loi}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Nhóm theo Arena */}
                {(() => {
                  const rows = [];
                  const grouped = {};
                  filteredData.forEach((row) => {
                    if (!grouped[row.Arena]) grouped[row.Arena] = [];
                    grouped[row.Arena].push(row);
                  });
                  let rowIdx = 0;
                  Object.entries(grouped).forEach(([arena, groupRows]) => {
                    // Render từng dòng của Arena
                    groupRows.forEach((row, idx) => {
                      const baseStyle = {
                        background: rowIdx % 2 === 0 ? '#f1f5f9' : '#e2e8f0',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                      };
                      rows.push(
                        <tr
                          key={rowIdx}
                          style={baseStyle}
                          onMouseOver={e => e.currentTarget.style.background='#bae6fd'}
                          onMouseOut={e => e.currentTarget.style.background=rowIdx%2===0 ? '#f1f5f9' : '#e2e8f0'}
                        >
                          <td style={{
                            padding: '5px 8px',
                            borderBottom: '1px solid #cbd5e1',
                            textAlign: 'center',
                            fontWeight: 600,
                            background: '#fff',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                            borderRight: '1px solid #cbd5e1',
                          }}>{row.AP5}</td>
                          <td style={{padding: '5px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'center', borderRight: '1px solid #cbd5e1'}}>{row.Arena}</td>
                          <td style={{padding: '5px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'center', borderRight: '1px solid #cbd5e1'}}>{row["Tháng"]}</td>
                          <td style={{padding: '5px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'center', borderRight: '1px solid #cbd5e1'}}>{row["Năm"]}</td>
                          <td style={{padding: '5px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'center', borderRight: '1px solid #cbd5e1'}}>{row["Khung giờ"]}</td>
                          <td style={{padding: '5px 8px', borderBottom: '1px solid #cbd5e1', color: '#0f766e', fontWeight: 600, textAlign: 'center', borderRight: '1px solid #cbd5e1'}}>{row["Sản lượng"]}</td>
                          <td style={{padding: '5px 8px', borderBottom: '1px solid #cbd5e1', color: '#be123c', fontWeight: 600, textAlign: 'center', borderRight: '1px solid #cbd5e1'}}>{row["Sản lượng NG"]}</td>
                          <td style={{padding: '5px 8px', borderBottom: '1px solid #cbd5e1', color: '#2563eb', fontWeight: 600, textAlign: 'center', borderRight: '1px solid #cbd5e1'}}>{row["% Hiệu suất"]}</td>
                          {allLoiKeys.map((loi, i) => (
                            <td key={loi} style={{
                              padding: '5px 8px',
                              borderBottom: '1px solid #cbd5e1',
                              color: '#b45309',
                              fontWeight: 500,
                              textAlign: 'center',
                              borderRight: i === allLoiKeys.length-1 ? undefined : '1px solid #cbd5e1',
                            }}>
                              {row.Lỗi && row.Lỗi[loi] !== undefined ? row.Lỗi[loi] : 0}
                            </td>
                          ))}
                        </tr>
                      );
                      rowIdx++;
                    });
                    // Dòng tổng cho Arena này
                    const totalSanLuong = groupRows.reduce((sum, r) => sum + Number(r["Sản lượng"] || 0), 0);
                    const totalSanLuongNG = groupRows.reduce((sum, r) => sum + Number(r["Sản lượng NG"] || 0), 0);
                    const totalLoi = {};
                    allLoiKeys.forEach(loi => {
                      totalLoi[loi] = groupRows.reduce((sum, r) => sum + Number(r.Lỗi && r.Lỗi[loi] ? r.Lỗi[loi] : 0), 0);
                    });
                    rows.push(
                      <tr key={arena + "-total"} style={{background: '#fde68a', fontWeight: 700}}>
                        <td colSpan={5} style={{textAlign: 'right', padding: '5px 8px', borderBottom: '2px solid #f59e42', color: '#b45309'}}>TỔNG {arena}</td>
                        <td style={{padding: '5px 8px', borderBottom: '2px solid #f59e42', color: '#0f766e', fontWeight: 700, textAlign: 'center'}}>{totalSanLuong}</td>
                        <td style={{padding: '5px 8px', borderBottom: '2px solid #f59e42', color: '#be123c', fontWeight: 700, textAlign: 'center'}}>{totalSanLuongNG}</td>
                        <td style={{padding: '5px 8px', borderBottom: '2px solid #f59e42', color: '#2563eb', fontWeight: 700, textAlign: 'center'}}>-</td>
                        {allLoiKeys.map((loi, i) => (
                          <td key={loi} style={{
                            padding: '5px 8px',
                            borderBottom: '2px solid #f59e42',
                            color: '#b45309',
                            fontWeight: 700,
                            textAlign: 'center',
                            background: '#fde68a',
                          }}>{totalLoi[loi]}</td>
                        ))}
                      </tr>
                    );
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Metandeco;

