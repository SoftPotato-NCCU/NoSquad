"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: 實現真實的登入 API 調用
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      // if (!response.ok) {
      //   throw new Error('登入失敗');
      // }

      console.log("登入表單數據:", formData);
      // 模擬成功
      alert("登入成功！");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: "url(/images/auth/auth_background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* 半透明覆蓋層 - 確保文本可讀性 */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>

      {/* ─── 左側品牌區域：fixed，桌面版才顯示 ─── */}
      <div className="hidden lg:flex fixed top-0 left-0 w-1/2 h-screen flex-col justify-start pt-16 px-12 z-20 pointer-events-none">
        <div className="max-w-md pointer-events-auto">
          {/* Logo 和標題行 */}
          <div className="flex items-center gap-4 mb-8">
            <div className="inline-flex flex-shrink-0 items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-400/20">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              登入 NoSquad
            </h1>
          </div>

          {/* 說明文字 */}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              在這裡，
            </span>
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
            >
              從沒被揪的人，
            </span>
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
            >
              變成最會揪的人。
            </span>
          </p>
        </div>

        {/* 左下角裝飾圖片 — fixed 在左半邊底部 */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-150px",
            left: "190px",
            width: "680px",
            height: "680px",
          }}
        >
          <img
            src="/images/auth/auth_pic.png"
            alt="decoration"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* ─── 右側表單區域：正常文檔流，左半寬度留給 fixed 左欄 ─── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center lg:justify-end px-4 sm:px-6 lg:pr-12 py-12 sm:py-16 lg:ml-[50%]">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 sm:p-8 md:p-10">
            {/* 手機版 Logo 區域 */}
            <div className="mb-6 sm:mb-8 text-center lg:hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 mb-4">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                NoSquad
              </h1>
            </div>

            {/* 桌面版標題 */}
            <div className="mb-6 sm:mb-8 hidden lg:block">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                登入以繼續
              </h2>
            </div>

            {/* 錯誤提示 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm flex items-start gap-3">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* 登入表單 */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* 電子郵件字段 */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  電子郵件
                </label>
                <div className="relative group">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  />
                  <svg
                    className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 opacity-60"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                  </svg>
                </div>
              </div>

              {/* 密碼字段 */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  密碼
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  />
                  <svg
                    className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 opacity-60"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>

              {/* 記住我和忘記密碼 */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-gray-100 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    記住我
                  </span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  忘記密碼？
                </Link>
              </div>

              {/* 登入按鈕 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none transform hover:translate-y-[-2px] disabled:translate-y-0 text-base sm:text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    登入中...
                  </div>
                ) : (
                  "登入"
                )}
              </button>
            </form>

            {/* 分割線 */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-300"></div>
              <span className="text-xs text-gray-400">或</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-300"></div>
            </div>

            {/* 社交登入 */}
            <div className="space-y-2">
              <button
                type="button"
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M15.545 6.558a9.42 9.42 0 01.139 1.626c0 2.889-2.126 5.413-5.033 5.413-1.578 0-3.055-.643-4.118-1.713-.577.54-1.294 1.017-2.09 1.309 1.493 1.547 3.637 2.517 6.029 2.517 4.917 0 8.855-3.938 8.855-8.855 0-.55-.053-1.089-.156-1.617a5.148 5.148 0 001.597-3.68z"></path>
                </svg>
                Google 登入
              </button>
            </div>

            {/* 註冊鏈接 */}
            <div className="mt-6 text-center text-sm text-gray-600">
              還沒有帳户？{" "}
              <Link
                href="/auth/signup"
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                立即註冊
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
