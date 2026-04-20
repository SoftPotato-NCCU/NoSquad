"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, setToken } from "@/lib/api";
import { useDictionary, t } from "@/lib/i18n/useDictionary";

interface LoginFormData {
  identifier: string;
  password: string;
}

function LoginContent() {
  const router = useRouter();
  const { dict } = useDictionary("auth");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<LoginFormData>({
    identifier: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await login(formData.identifier, formData.password);
      console.log("[Login] Got response, setting token");
      setToken(response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      console.log("[Login] Token set, redirecting to /");
      window.location.href = "/";
    } catch (err: unknown) {
      let message = t(dict, 'auth.errors.loginFailed', "Login failed, please try again");

      if (err && typeof err === 'object' && 'error' in err) {
        const error = err.error as {
          message?: string;
          details?: Array<{ field: string; message: string }>;
        };
        if (error.details && error.details.length > 0) {
          message = error.details.map((d) => d.message).join(", ");
        } else if (error.message) {
          message = error.message;
        }
      }

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #F8FAFC 0%, #EEF2F7 50%, #E5EAF0 100%)",
      }}
    >
      {/* ─── 左側品牌區域：fixed，桌面版才顯示 ─── */}
      <div className="hidden lg:flex fixed top-0 left-0 w-1/2 h-screen flex-col justify-between pt-16 pb-12 px-12 z-20 pointer-events-none">
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
              {t(dict, 'auth.login.title', 'Login to NoSquad')}
            </h1>
          </div>

          {/* 說明文字 */}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              {t(dict, 'auth.login.subtitle.line1', 'In here,')}
            </span>
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
            >
              {t(dict, 'auth.login.subtitle.line2', 'from the one who\'s never invited,')}
            </span>
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
            >
              {t(dict, 'auth.login.subtitle.line3', 'to the one who hosts it all.')}
            </span>
          </p>
        </div>

        {/* 裝飾圖片 — 在左下角 */}
        <div className="pointer-events-auto w-96 h-96 mx-auto pb-8">
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
                {t(dict, 'auth.login.title', 'Login to continue')}
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
              {/* 電子郵件/帳號字段 */}
              <div>
                <label
                  htmlFor="identifier"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {t(dict, 'auth.login.form.identifier', 'Email / Username / Phone')}
                </label>
                <div className="relative group">
                  <input
                    id="identifier"
                    type="text"
                    name="identifier"
                    value={formData.identifier}
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
                  {t(dict, 'auth.login.form.password', 'Password')}
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
                    {t(dict, 'auth.login.form.rememberMe', 'Remember me')}
                  </span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  {t(dict, 'auth.login.form.forgotPassword', 'Forgot password?')}
                </Link>
              </div>

              {/* 登入按鈕 */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none transform hover:translate-y-[-2px] disabled:translate-y-0 text-base sm:text-lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    {t(dict, 'auth.login.form.submitting', 'Logging in...')}
                  </div>
                ) : (
                  t(dict, 'auth.login.form.submit', 'Login')
                )}
              </button>
            </form>

            {/* 分割線 */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-300"></div>
              <span className="text-xs text-gray-400">{t(dict, 'auth.login.divider', 'OR')}</span>
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
                {t(dict, 'auth.login.socialLogin', 'Sign in with Google')}
              </button>
            </div>

            {/* 註冊鏈接 */}
            <div className="mt-6 text-center text-sm text-gray-600">
              {t(dict, 'auth.login.signupLink', "Don't have an account?")}{" "}
              <Link
                href="/auth/signup"
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                {t(dict, 'auth.login.signupAction', 'Sign up now')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
