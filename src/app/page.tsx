"use client";
import { useState } from "react";

type Product = {
  PRD_ID: string;
  CODE: string;
  NAME: string;
  PRICE: number;
  PRICE_INC_TAX: number;
};

type CartItem = {
  DTL_ID: number;
  PRD_ID: string;
  PRD_CODE: string;
  PRD_NAME: string;
  PRD_PRICE: number;
  PRD_PRICE_INC_TAX: number;
};

export default function Home() {
  // 商品コード（JAN等）
  const [prdCode, setPrdCode] = useState("");
  // 商品ID（一意キー）
  const [prdId, setPrdId] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalAmount_INC_TAX, setTotalAmount_INC_TAX] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  function handleScan() {
    const dummyCode = prompt("商品コードを入力（デモ）");
    if (dummyCode) {
      setPrdCode(dummyCode);
      fetchProductByCODE(dummyCode);
    }
  }

  async function fetchProductByCODE(CODE: string) {
    setLoading(true);
    setError("");
    setProduct(null);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_ENDPOINT + `/shouhin?CODE=${CODE}`,
        { cache: "no-cache" }
      );
      if (!res.ok) throw new Error("Failed to fetch shouhin");

      const data = await res.json();
      if (!data || !data.NAME) {
        setError("商品がマスタ未登録です");
        setProduct(null);
        setPrdId(""); // IDもクリア
      } else {
        setProduct(data);
        setPrdId(data.PRD_ID); // IDをセット
      }
    } catch (e) {
      setError("通信エラーが発生しました");
      setProduct(null);
      setPrdId("");
    } finally {
      setLoading(false);
    }
  }

  function handleAddToCart() {
    if (product) {
      const DTL_ID = cart.length + 1;
      const newItem: CartItem = {
        DTL_ID,
        PRD_ID: product.PRD_ID,
        PRD_CODE: product.CODE,
        PRD_NAME: product.NAME,
        PRD_PRICE: product.PRICE,
        PRD_PRICE_INC_TAX: product.PRICE_INC_TAX,
      };
      setCart([...cart, newItem]);
      setTotalAmount(totalAmount + product.PRICE); // 合計は抜き価格
      setTotalAmount_INC_TAX(totalAmount_INC_TAX + product.PRICE_INC_TAX); // 合計は税込価格
    }
  }

  async function handlePurchase() {
    if (cart.length === 0) return;
    try {
      // 1. 取引ヘッダ登録
      const tRes = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + "/torihiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          DATETIME: new Date().toISOString().slice(0, 19).replace('T', ' '),
          EMP_CD: "1",
          STORE_CD: "30",
          POS_NO: "1",
          TOTAL_AMT: totalAmount,
          TTL_AMT_EX_TAX: totalAmount,
          TTL_AMT_INC_TAX: totalAmount_INC_TAX,
        }),
      });
      if (!tRes.ok) throw new Error("取引登録失敗");
      const { TRD_ID } = await tRes.json();

      // 2. 取引明細登録
      for (const item of cart) {
        await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + "/torimei", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            TRD_ID,
            DTL_ID: item.DTL_ID,
            PRD_ID: item.PRD_ID,
            PRD_CODE: item.PRD_CODE,
            PRD_NAME: item.PRD_NAME,
            PRD_PRICE: item.PRD_PRICE,
            PRD_PRICE_INC_TAX: item.PRD_PRICE_INC_TAX,
          }),
        });
      }

      setShowPopup(true);
    } catch (e) {
      alert("購入処理に失敗しました");
    }
  }

  function resetAll() {
    setCart([]);
    setTotalAmount(0);
    setTotalAmount_INC_TAX(0);
    setProduct(null);
    setPrdCode("");
    setPrdId("");
    setError("");
    setShowPopup(false);
  }

  return (
    <div className="min-h-screen bg-lime-50 flex flex-col items-center justify-start py-6 px-2 font-[family-name:var(--font-geist-sans)]">
      {/* スキャンボタン */}
      <button
        className="
          mb-4 w-full max-w-xs py-3 rounded-xl bg-gradient-to-b from-blue-200 to-blue-400
          text-xl font-bold text-black shadow-md active:translate-y-1
        "
        onClick={handleScan}
      >
        スキャン（カメラ）
      </button>

      {/* 商品コード欄 */}
      <div className="w-full max-w-xs mb-2">
        <div className="border border-black rounded-lg py-2 px-3 text-lg text-center bg-white min-h-[2.5rem]">
          {prdCode || <span className="text-black-300">商品コード</span>}
        </div>
      </div>

      {/* 商品名欄 */}
      <div className="w-full max-w-xs mb-2">
        <div className="border border-black rounded-lg py-2 px-3 text-lg text-center bg-white min-h-[2.5rem]">
          {error === "商品がマスタ未登録です"
            ? <span className="text-red-600 font-bold">{error}</span>
            : product
              ? product.NAME
              : "商品名"}
        </div>
      </div>

      {/* 単価欄 */}
      <div className="w-full max-w-xs mb-2">
        <div className="border border-black rounded-lg py-2 px-3 text-lg text-center bg-white min-h-[2.5rem]">
          {product ? `${product.PRICE}円（税抜）` : "単価"}
        </div>
      </div>

      {/* 税込欄 */}
      <div className="w-full max-w-xs mb-4">
        <div className="border border-black rounded-lg py-2 px-3 text-lg text-center bg-white min-h-[2.5rem]">
          {product ? `${product.PRICE_INC_TAX}円（税込）` : "税込"}
        </div>
      </div>

      {/* 商品読み込みボタン */}
      <button
        className={`
          mb-2 w-full max-w-xs py-2 rounded-lg border-2 border-black
          bg-gradient-to-b from-blue-100 to-blue-300
          hover:from-blue-400 hover:to-blue-400 font-bold
          shadow-md
          active:translate-y-1 active:shadow
          transition-all
          ${!prdCode || loading ? "opacity-50 pointer-events-none" : ""}
        `}
        disabled={!prdCode || loading}
        onClick={() => fetchProductByCODE(prdCode)}
      >
        {loading ? "検索中..." : "商品情報 読み込み"}
      </button>

      {/* 追加ボタン */}
      <button
        className="
          mb-4 w-full max-w-xs py-2 rounded-lg border-2 border-black
          bg-gradient-to-b from-blue-100 to-blue-300
          hover:from-blue-400 hover:to-blue-400 font-bold
          shadow-md
          active:translate-y-1 active:shadow
          transition-all
        "
        disabled={!product}
        onClick={handleAddToCart}
      >
        追加
      </button>

      {/* 購入リスト */}
      <div className="w-full max-w-xs mb-2">
        <h2 className="text-lg font-bold mb-1 text-center">購入リスト</h2>
        <div className="border border-black rounded-lg p-3 h-[200px] overflow-auto bg-white mb-2">
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center">購入リストは空です</p>
          ) : (
            <ul className="text-center">
              {cart.map((item, idx) => (
                <li key={idx}>
                  {item.PRD_NAME} ×1 {item.PRD_PRICE}円
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 購入ボタン */}
      <button
        className="
          w-full max-w-xs py-2 rounded-lg border-2 border-black
          bg-gradient-to-b from-red-100 to-red-300
          hover:from-red-400 hover:to-red-400 font-bold
          shadow-md
          active:translate-y-1 active:shadow
          transition-all
        "
        onClick={handlePurchase}
        disabled={cart.length === 0}
      >
        購入
      </button>

      {/* 合計金額のポップアップ */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
            <div className="text-xl font-bold mb-4">合計金額(税抜)：{totalAmount}円</div>
            <div className="text-xl font-bold mb-4">合計金額(税込)：{totalAmount_INC_TAX}円</div>
            <button
              className="border-2 border-black bg-blue-200 hover:bg-blue-400 px-8 py-2 font-bold rounded-lg"
              onClick={resetAll}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}