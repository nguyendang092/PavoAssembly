import { useState } from "react";
import { ref, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

const ProductionInputCell = ({ area, slot, production, actual }) => {
  const key = area.replace(/\//g, "_");
  const [prodValue, setProdValue] = useState(production ?? "");
  const [actualValue, setActualValue] = useState(actual ?? "");

  const updateFirebase = (path, value, label) => {
    set(ref(db, path), value)
      .then(() => toast.success(`✅ Cập nhật ${label} thành công!`))
      .catch(() => toast.error(`❌ Lỗi cập nhật ${label}`));
  };

  const handleProdBlur = () => {
    const value = parseInt(prodValue) || 0;
    updateFirebase(`production/${key}/${slot}`, value, "sản lượng");
  };

  const handleActualBlur = () => {
    const value = parseInt(actualValue) || 0;
    updateFirebase(`actual/${key}/${slot}`, value, "thực tế");
  };

  return (
    <td className="flex flex-col items-center gap-1 p-1">
      {/* Sản lượng input */}
      <input
        type="number"
        value={prodValue}
        onChange={(e) => setProdValue(e.target.value)}
        onBlur={handleProdBlur}
        className="w-16 text-center border border-blue-400 rounded bg-blue-50"
        placeholder="SL"
      />

      {/* Thực tế input */}
      <input
        type="number"
        value={actualValue}
        onChange={(e) => setActualValue(e.target.value)}
        onBlur={handleActualBlur}
        className="w-16 text-center border border-gray-400 rounded bg-gray-100"
        placeholder="TT"
      />
    </td>
  );
};

export default ProductionInputCell;
