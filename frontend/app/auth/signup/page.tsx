"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import "./phone-input.css";
import { register } from "@/lib/api";
import { useDictionary, t } from "@/lib/i18n/useDictionary";
import SettingsMenu from "@/components/SettingsMenu";

interface SignupFormData {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

function SignupContent() {
  const router = useRouter();
  const { dict } = useDictionary("auth");
const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!dict) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, type } = e.target;

    if (type === "checkbox") {
      const checkboxElement = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: checkboxElement.checked,
      }));
    } else {
      const { value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setError("");
  };

  const handlePhoneChange = (phone: string) => {
    setFormData((prev) => ({
      ...prev,
      phone,
    }));
    setPhoneError("");
    setError("");
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError(
        t(dict, "auth.signup.errors.nameRequired", "Please enter your name"),
      );
      return false;
    }
    if (!formData.username.trim()) {
      setError(
        t(
          dict,
          "auth.signup.errors.identifierRequired",
          "Please enter a username",
        ),
      );
      return false;
    }
    if (formData.username.length < 3) {
      setError(
        t(
          dict,
          "auth.signup.errors.usernameMinLength",
          "Username must be at least 3 characters",
        ),
      );
      return false;
    }
    if (!formData.email.includes("@")) {
      setError(
        t(
          dict,
          "auth.signup.errors.emailRequired",
          "Please enter a valid email",
        ),
      );
      return false;
    }
    // if (!formData.phone.startsWith("+")) {
    //   setError(
    //     t(
    //       dict,
    //       "auth.signup.errors.phoneRequired",
    //       "Phone must use E.164 format (e.g. +886912345678)",
    //     ),
    //   );
    //   return false;
    // }
    if (formData.password.length < 8) {
      setError(
        t(
          dict,
          "auth.signup.errors.passwordRequired",
          "Password must be at least 8 characters",
        ),
      );
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(
        t(
          dict,
          "auth.signup.errors.passwordsNotMatch",
          "Passwords do not match",
        ),
      );
      return false;
    }
    if (!formData.agreeToTerms) {
      setError(
        t(
          dict,
          "auth.signup.errors.termsRequired",
          "Please agree to the terms",
        ),
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await register({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      router.push("/auth/login?registered=true");
    } catch (err: unknown) {
      let message = t(
        dict,
        "auth.signup.errors.signupFailed",
        "Registration failed, please try again",
      );

      if (err && typeof err === "object" && "error" in err) {
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden auth-bg">
      <SettingsMenu />
      {/* ─── 左側品牌區域：fixed，桌面版才顯示 ─── */}
      <div className="hidden lg:flex fixed top-0 left-0 w-1/2 h-screen flex-col justify-between pt-16 pb-12 px-12 z-20 pointer-events-none">
        <div className="max-w-[clamp(28rem,30vw,42rem)] pointer-events-auto">
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
            <h1 className="text-[clamp(3rem,3vw,6rem)] font-bold text-gray-900 dark:text-white leading-tight">
              {t(dict, "auth.signup.title", "Join NoSquad")}
            </h1>
          </div>

          {/* 說明文字 */}
          <p className="text-[clamp(1.25rem,1.35vw,2.2rem)] text-gray-600 dark:text-zinc-400 mb-8 leading-relaxed">
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              {t(dict, "auth.signup.subtitle.line1", "In here,")}
            </span>
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
            >
              {t(
                dict,
                "auth.signup.subtitle.line2",
                "from the one who's never invited,",
              )}
            </span>
            <span
              className="block opacity-0 animate-fadeInUp"
              style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}
            >
              {t(
                dict,
                "auth.signup.subtitle.line3",
                "to the one who hosts it all.",
              )}
            </span>
          </p>
        </div>

        {/* 裝飾圖片 — 在左下角 */}
        <div className="pointer-events-auto w-[clamp(22rem,32vw,46rem)] h-[clamp(22rem,32vw,46rem)] ml-auto -mr-30 pb-8 -mb-25">
          <img
            src="/images/auth/auth_pic.png"
            alt="decoration"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* ─── 右側表單區域：正常文檔流，左半寬度留給 fixed 左欄 ─── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center lg:justify-end px-4 sm:px-6 lg:pr-12 py-12 sm:py-16 lg:ml-[50%]">
        <div className="w-full max-w-[clamp(32rem,34vw,52rem)]">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 md:p-10">
            {/* 手機版 Logo 區域 */}
            <div className="mb-6 sm:mb-8 text-center lg:hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 mb-4 shadow-lg shadow-purple-400/20">
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
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {t(dict, "auth.signup.title", "Join NoSquad")}
              </h1>
            </div>

            {/* 桌面版標題 */}
            <div className="mb-6 sm:mb-8 hidden lg:block">
              <h2 className="text-[clamp(2rem,2.2vw,3.75rem)] font-bold text-gray-900 dark:text-white mb-2">
                {t(dict, "auth.signup.form.title", "Create your account")}
              </h2>
            </div>

            {/* 錯誤提示 */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-[clamp(0.95rem,1.1vw,1.25rem)] flex items-start gap-3">
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

            {/* 註冊表單 */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* 姓名 */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-[clamp(0.95rem,1.1vw,1.25rem)] font-semibold text-gray-700 dark:text-zinc-300 mb-2"
                >
                  {t(dict, "auth.signup.form.name", "Name")}
                </label>
                <div className="relative group">
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-[clamp(0.95rem,1.1vw,1.25rem)]"
                  />
                  <svg
                    className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 opacity-60"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path>
                  </svg>
                </div>
              </div>

              {/* 用戶名 */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-[clamp(0.95rem,1.1vw,1.25rem)] font-semibold text-gray-700 dark:text-zinc-300 mb-2"
                >
                  {t(dict, "auth.signup.form.username", "Username")}
                </label>
                <div className="relative group">
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="example_user"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-[clamp(0.95rem,1.1vw,1.25rem)]"
                  />
                  <svg
                    className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 opacity-60"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path>
                  </svg>
                </div>
              </div>

              {/* 電子郵件字段 */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-[clamp(0.95rem,1.1vw,1.25rem)] font-semibold text-gray-700 dark:text-zinc-300 mb-2"
                >
                  {t(dict, "auth.signup.form.email", "Email")}
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-[clamp(0.95rem,1.1vw,1.25rem)]"
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

              {/* 電話字段 */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-[clamp(0.95rem,1.1vw,1.25rem)] font-semibold text-gray-700 dark:text-zinc-300 mb-2"
                >
                  {t(dict, "auth.signup.form.phone", "Phone (E.164 format)")}
                </label>
                <div className="relative">
                  <div className="bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg flex items-center h-[clamp(3rem,3.2vw,3.75rem)]">
                    <PhoneInput
                      defaultCountry="tw"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="912345678"
                      className="phone-input"
                    />
                  </div>
                  <svg
                    className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 opacity-60"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.706 1.945a1 1 0 01-.54 1.06l-1.548.773a11.026 11.026 0 006.104 6.104l.774-1.548a1 1 0 011.059-.54l1.945.707a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                  </svg>
                </div>
                {phoneError && (
                  <p className="mt-1 text-sm text-red-500">{phoneError}</p>
                )}
              </div>

              {/* 密碼字段 */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[clamp(0.95rem,1.1vw,1.25rem)] font-semibold text-gray-700 dark:text-zinc-300 mb-2"
                >
                  {t(dict, "auth.signup.form.password", "Password")}
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
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-[clamp(0.95rem,1.1vw,1.25rem)]"
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
                <p className="text-xs text-gray-500 mt-1">
                  {t(
                    dict,
                    "auth.signup.form.passwordHint",
                    "At least 8 characters",
                  )}
                </p>
              </div>

              {/* 確認密碼字段 */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[clamp(0.95rem,1.1vw,1.25rem)] font-semibold text-gray-700 dark:text-zinc-300 mb-2"
                >
                  {t(
                    dict,
                    "auth.signup.form.confirmPassword",
                    "Confirm Password",
                  )}
                </label>
                <div className="relative group">
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-[clamp(0.95rem,1.1vw,1.25rem)]"
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

              {/* 服務條款複選框 */}
              <label className="flex items-start group cursor-pointer pt-2">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="w-4 h-4 mt-1 rounded bg-gray-100 dark:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-purple-600 focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <span className="ml-3 text-[clamp(0.95rem,1.1vw,1.25rem)] text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {t(dict, "auth.signup.form.agreeTerms", "I agree to the")}{" "}
                  <Link
                    href="/terms"
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                  >
                    {t(dict, "auth.signup.form.terms", "Terms of Service")}{" "}
                  </Link>
                  {t(dict, "auth.signup.form.and", "and")}{" "}
                  <Link
                    href="/privacy"
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                  >
                    {t(dict, "auth.signup.form.privacy", "Privacy Policy")}
                  </Link>
                </span>
              </label>

              {/* 註冊按鈕 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-purple-400 disabled:to-blue-400 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none transform hover:translate-y-[-2px] disabled:translate-y-0 text-[clamp(1rem,1.1vw,1.6rem)]"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    {t(
                      dict,
                      "auth.signup.form.submitting",
                      "Creating account...",
                    )}
                  </div>
                ) : (
                  t(dict, "auth.signup.form.submit", "Create Account")
                )}
              </button>
            </form>

            {/* 分割線 */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-300"></div>
              <span className="text-xs text-gray-400">
                {t(dict, "auth.signup.divider", "OR")}
              </span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-300"></div>
            </div>

            {/* 社交註冊 */}
            <div className="space-y-2">
              <button
                type="button"
                className="w-full py-2.5 px-4 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-[clamp(0.95rem,1.1vw,1.25rem)] shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M15.545 6.558a9.42 9.42 0 01.139 1.626c0 2.889-2.126 5.413-5.033 5.413-1.578 0-3.055-.643-4.118-1.713-.577.54-1.294 1.017-2.09 1.309 1.493 1.547 3.637 2.517 6.029 2.517 4.917 0 8.855-3.938 8.855-8.855 0-.55-.053-1.089-.156-1.617a5.148 5.148 0 001.597-3.68z"></path>
                </svg>
                {t(dict, "auth.signup.socialLogin", "Sign up with Google")}
              </button>
            </div>

            {/* 登入鏈接 */}
            <div className="mt-6 text-center text-[clamp(0.95rem,1.1vw,1.25rem)] text-gray-600">
              {t(dict, "auth.signup.loginLink", "Already have an account?")}{" "}
              <Link
                href="/auth/login"
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
              >
                {t(dict, "auth.signup.loginAction", "Sign in now")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
