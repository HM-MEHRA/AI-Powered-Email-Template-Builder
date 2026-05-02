import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import EmailBuilder from "./components/EmailBuilder";
import { STORAGE_KEYS } from "./components/emailBuilder/builderConstants";
import {
  confirmPasswordReset,
  fetchCurrentUser,
  isAuthenticated,
  login,
  logout,
  signup,
} from "./services/ai";

const EMPTY_AUTH_FORM = {
  username: "mehrahimanshu",
  email: "iamhimanshumehra20@gmail.com",
  password: "",
  firstName: "Himanshu",
  lastName: "Mehra",
};

const LOGIN_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

const getDisplayName = (user) =>
  `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
  user?.username ||
  "User";

const clearSavedDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.draft);
};

const readPasswordResetParams = () => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const uid = params.get("reset_uid");
  const token = params.get("reset_token");
  return window.location.hash === "#reset-password" && uid && token ? { uid, token } : null;
};

class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Workspace crashed", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleClearDraft = () => {
    clearSavedDraft();
    this.setState({ hasError: false });
    if (typeof window !== "undefined") {
      window.location.hash = "#generate";
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-[100svh] place-items-center bg-[linear-gradient(135deg,#020617_0%,#0f172a_52%,#115e59_100%)] px-4 text-white">
        <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white/10 p-6 text-center shadow-[0_34px_120px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-100">Workspace Recovery</p>
          <h1 className="mt-4 text-3xl font-semibold">Your session is safe.</h1>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            The builder hit a bad saved draft or stale browser state. Clear the saved draft and reopen the workspace.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleClearDraft}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_16px_34px_rgba(255,255,255,0.12)]"
            >
              Clear Saved Draft
            </button>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const authPageMotion = {
  initial: { opacity: 0, y: 24, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 1.03, filter: "blur(16px)" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const cardMotion = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.12 },
};

const builderMotion = {
  initial: { opacity: 0, y: 28, scale: 0.985, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -18, filter: "blur(10px)" },
  transition: { duration: 0.68, ease: [0.22, 1, 0.36, 1] },
};

const backgroundBands = [
  { left: "-8%", top: "8%", width: "56%", rotate: -18, color: "rgba(14,165,233,0.18)", delay: 0 },
  { left: "34%", top: "2%", width: "48%", rotate: 16, color: "rgba(249,115,22,0.16)", delay: 0.5 },
  { left: "54%", top: "58%", width: "54%", rotate: -12, color: "rgba(16,185,129,0.14)", delay: 1 },
  { left: "-6%", top: "72%", width: "42%", rotate: 10, color: "rgba(244,114,182,0.12)", delay: 1.4 },
];

const floatingMailCards = [
  { left: "8%", top: "14%", width: 128, rotate: -8, delay: 0, duration: 8.5 },
  { left: "72%", top: "12%", width: 112, rotate: 9, delay: 0.8, duration: 9.4 },
  { left: "58%", top: "74%", width: 148, rotate: -6, delay: 1.4, duration: 10 },
  { left: "14%", top: "82%", width: 104, rotate: 8, delay: 2.1, duration: 8.8 },
];

const draftStages = [
  {
    label: "AI composing",
    tone: "Drafting",
    accent: "bg-orange-400 text-slate-950",
    lines: [
      "Hi Himanshu, thank you for your time today.",
      "I liked learning about the team and the role.",
      "Please let me know if you need anything else.",
    ],
  },
  {
    label: "Polished version ready",
    tone: "Warm",
    accent: "bg-emerald-300 text-slate-950",
    lines: [
      "Hello Himanshu, thank you for taking the time to speak with me today.",
      "I enjoyed learning more about the team, the role, and the next steps.",
      "I would be happy to share any additional details that would be helpful.",
    ],
  },
];

const AuthBackground = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    <motion.div
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
      className="absolute inset-0 opacity-90"
      style={{
        background:
          "linear-gradient(135deg, rgba(16,19,31,0.98) 0%, rgba(27,38,59,0.94) 38%, rgba(17,94,89,0.62) 70%, rgba(15,23,42,0.95) 100%)",
        backgroundSize: "180% 180%",
      }}
    />
    <motion.div
      animate={{ x: ["-12%", "8%", "-12%"], opacity: [0.32, 0.55, 0.32] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(249,115,22,0.22),rgba(14,165,233,0.2),rgba(16,185,129,0.18))]"
    />
    {backgroundBands.map((band) => (
      <motion.div
        key={`${band.left}-${band.top}`}
        animate={{ x: [0, 28, -12, 0], y: [0, -16, 18, 0], opacity: [0.28, 0.52, 0.34, 0.28] }}
        transition={{ duration: 11, repeat: Infinity, delay: band.delay, ease: "easeInOut" }}
        className="absolute h-24 rounded-[32px] blur-2xl"
        style={{
          left: band.left,
          top: band.top,
          width: band.width,
          rotate: `${band.rotate}deg`,
          background: band.color,
        }}
      />
    ))}
    {floatingMailCards.map((card, index) => (
      <motion.div
        key={`${card.left}-${card.top}`}
        initial={{ opacity: 0, y: 18, rotate: card.rotate }}
        animate={{
          opacity: [0.2, 0.44, 0.2],
          y: [0, -18, 0],
          x: [0, index % 2 ? -12 : 12, 0],
          rotate: [card.rotate, card.rotate + (index % 2 ? -2 : 2), card.rotate],
        }}
        transition={{ duration: card.duration, repeat: Infinity, delay: card.delay, ease: "easeInOut" }}
        className="absolute rounded-[18px] border border-white/12 bg-white/10 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur"
        style={{ left: card.left, top: card.top, width: card.width }}
      >
        <div className="h-2 w-9 rounded-full bg-white/35" />
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded-full bg-white/20" />
          <div className="h-2 w-3/4 rounded-full bg-white/15" />
        </div>
      </motion.div>
    ))}
  </div>
);

const AnimatedDraftShowcase = () => {
  const [stageIndex, setStageIndex] = useState(0);
  const activeStage = draftStages[stageIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % draftStages.length);
    }, 4300);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 28, rotate: -1, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8 hidden max-w-xl overflow-hidden rounded-[28px] border border-white/12 bg-white/10 shadow-[0_26px_80px_rgba(0,0,0,0.24)] backdrop-blur md:block"
    >
      <div className="relative border-b border-white/10 px-5 py-4">
        <motion.div
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 3.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
          className="absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]"
        />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Live draft</p>
            <p className="mt-1 text-sm font-semibold text-white">Interview follow-up</p>
          </div>
          <motion.div
            key={activeStage.tone}
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.04, 1] }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-full px-3 py-1 text-xs font-bold ${activeStage.accent}`}
          >
            {activeStage.tone}
          </motion.div>
        </div>
      </div>
      <div className="relative grid gap-3 p-5">
        <motion.div
          animate={{ left: ["8%", "78%", "8%"] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-3 h-[calc(100%-1.5rem)] w-px bg-cyan-300/28"
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.label}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-3"
          >
            {activeStage.lines.map((line, index) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: index * 0.18 }}
                className="relative overflow-hidden rounded-2xl bg-white/12 px-4 py-3 text-sm text-slate-200"
              >
                <motion.span
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.15, delay: 0.18 + index * 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 left-0 bg-white/[0.05]"
                />
                {stageIndex === 1 && (
                  <motion.span
                    initial={{ x: "-130%" }}
                    animate={{ x: "230%" }}
                    transition={{ duration: 1, delay: 0.38 + index * 0.22, ease: "easeInOut" }}
                    className="absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.28),transparent)]"
                  />
                )}
                <span className="relative">{line}</span>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        <div className="mt-1 flex items-center gap-2 text-xs font-medium text-cyan-100">
          <motion.span
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-cyan-300"
          />
          {activeStage.label}
        </div>
      </div>
    </motion.div>
  );
};

const EnvelopeUnlock = ({ userName }) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0, y: 18 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    className="relative w-[min(88vw,480px)] overflow-hidden rounded-[32px] border border-white/12 bg-white p-8 text-center text-slate-950 shadow-[0_34px_120px_rgba(0,0,0,0.5)]"
  >
    <motion.div
      initial={{ scale: 0.15, opacity: 0.6 }}
      animate={{ scale: 8, opacity: 0 }}
      transition={{ duration: 1.25, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 blur-xl"
    />
    <div className="relative mx-auto h-44 w-72 max-w-full">
      <motion.div
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: [-2, -48, -42], opacity: 1 }}
        transition={{ duration: 1.1, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-8 right-8 top-12 z-10 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace</p>
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded-full bg-slate-900" />
          <div className="h-2 w-4/5 rounded-full bg-slate-200" />
          <div className="h-2 w-2/3 rounded-full bg-orange-300" />
        </div>
      </motion.div>
      <div className="absolute inset-x-3 bottom-3 z-20 h-28 rounded-b-[28px] bg-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.24)]" />
      <div
        className="absolute inset-x-3 bottom-3 z-30 h-28 bg-[linear-gradient(135deg,#f97316,#0ea5e9)]"
        style={{ clipPath: "polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)" }}
      />
      <motion.div
        initial={{ rotateX: 0, y: 0 }}
        animate={{ rotateX: -162, y: -2 }}
        transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-3 top-9 z-40 h-28 origin-top bg-orange-400 shadow-[0_16px_40px_rgba(249,115,22,0.22)]"
        style={{ clipPath: "polygon(0 0, 50% 72%, 100% 0)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 1, 0.6], scale: [0.7, 1.2, 1] }}
        transition={{ duration: 0.8, delay: 0.68, ease: "easeOut" }}
        className="absolute left-1/2 top-4 z-0 h-24 w-24 -translate-x-1/2 rounded-full bg-cyan-300/50 blur-2xl"
      />
    </div>
    <motion.h2
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: 0.44 }}
      className="relative mt-1 text-2xl font-semibold"
    >
      Welcome back, {userName || "Himanshu"}
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: 0.55 }}
      className="relative mt-2 text-sm leading-6 text-slate-500"
    >
      Opening your email workspace.
    </motion.p>
    <div className="relative mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#0ea5e9,#10b981)]"
      />
    </div>
  </motion.div>
);

const PasswordResetScreen = ({ resetParams, onComplete }) => {
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await confirmPasswordReset({
      uid: resetParams.uid,
      token: resetParams.token,
      newPassword: form.password,
    });
    setIsSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setStatus(result?.detail || "Password reset complete.");
    window.setTimeout(onComplete, 1100);
  };

  return (
    <motion.main
      {...authPageMotion}
      className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[#10131f] px-4 py-8 text-white"
    >
      <AuthBackground />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-[30px] border border-white/10 bg-white p-6 text-slate-950 shadow-[0_30px_100px_rgba(0,0,0,0.42)] sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-600">Password Recovery</p>
        <h1 className="mt-3 text-3xl font-semibold">Create a new password</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Enter a new password for your Inbox Studio account.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">New password</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Confirm password</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              required
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}
        {status ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>
        ) : null}

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_38px_rgba(15,23,42,0.25)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Resetting password..." : "Reset Password"}
        </motion.button>
      </form>
    </motion.main>
  );
};

const AuthScreen = ({ onAuthenticated }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY_AUTH_FORM);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockingName, setUnlockingName] = useState("Himanshu");

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const loginId = form.username.trim();
    if (mode === "login") {
      if (!loginId) {
        setError("Enter your login ID.");
        return;
      }
      if (loginId.includes("@")) {
        setError("Enter your login ID.");
        return;
      }
      if (!LOGIN_ID_PATTERN.test(loginId)) {
        setError("Login ID can use letters, numbers, dots, underscores, and hyphens.");
        return;
      }
    }

    setIsLoading(true);

    const payload =
      mode === "signup"
        ? {
            email: form.email.trim().toLowerCase(),
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
          }
        : {
            username: loginId,
            password: form.password,
          };

    const result =
      mode === "signup"
        ? await signup(payload)
        : await login({ username: payload.username, password: payload.password });

    setIsLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setUnlockingName(getDisplayName(result?.user).split(" ")[0] || "Himanshu");
    setIsUnlocking(true);
    window.setTimeout(() => onAuthenticated(result?.user), 1500);
  };

  return (
    <motion.main
      {...authPageMotion}
      className="relative min-h-[100svh] overflow-x-hidden bg-[#10131f] px-3 py-5 text-white sm:px-6 sm:py-8 lg:px-8"
    >
      <AuthBackground />

      <AnimatePresence>
        {isUnlocking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 grid place-items-center bg-slate-950/86 backdrop-blur-xl"
          >
            <EnvelopeUnlock userName={unlockingName} />
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="hidden"
            >
              <div className="relative mx-auto h-16 w-16">
                <motion.div
                  animate={{ rotate: [0, 90, 180, 270, 360] }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_90deg,#10b981,#0ea5e9,#f97316,#10b981)]"
                />
                <motion.div
                  animate={{ scale: [0.86, 1], opacity: [0, 1] }}
                  transition={{ duration: 0.38, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-1 grid place-items-center rounded-[14px] bg-emerald-500 text-base font-black text-white"
                >
                  OK
                </motion.div>
              </div>
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="hidden"
              >
                ✓
              </motion.div>
              <h2 className="mt-5 text-2xl font-semibold">Welcome back, Himanshu</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Opening your email workspace.
              </p>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.88, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#0ea5e9,#10b981)]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto grid min-h-[calc(100svh-2.5rem)] max-w-6xl items-center gap-8 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1fr_440px] lg:gap-10">
        <motion.section
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_18px_45px_rgba(8,47,73,0.22)] backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            AI Email Studio
          </div>
          <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight sm:mt-6 sm:text-6xl">
            Your next email, already half-written.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:mt-5 sm:text-base sm:leading-8">
            Step into a focused workspace for sharp drafts, saved templates,
            and cleaner follow-ups.
          </p>

          <div className="mt-6 grid max-w-xl gap-3 sm:mt-8 sm:grid-cols-3">
            {[
              ["4x", "draft options"],
              ["1 tap", "Gmail open"],
              ["24/7", "writing flow"],
            ].map(([value, label], index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.22 + index * 0.08 }}
                className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur"
              >
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-sm text-slate-300">{label}</p>
              </motion.div>
            ))}
          </div>

          <AnimatedDraftShowcase />
        </motion.section>

        <motion.section
          {...cardMotion}
          className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white p-5 text-slate-950 shadow-[0_30px_100px_rgba(0,0,0,0.4)] sm:rounded-[30px] sm:p-8"
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#f97316,#0ea5e9,#10b981)]" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
              {mode === "signup" ? "Create access" : "Private access"}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950 sm:text-3xl">
              {mode === "signup" ? "Start your account" : "Welcome back"}
            </h2>
          </div>

          <div className="mt-6 flex rounded-2xl bg-slate-100 p-1">
            {["login", "signup"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`relative flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  mode === item ? "text-white" : "text-slate-600"
                }`}
              >
                {mode === item && (
                  <motion.span
                    layoutId="active-auth-tab"
                    className="absolute inset-0 rounded-xl bg-slate-950 shadow-sm"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{item === "signup" ? "Sign up" : "Login"}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <AnimatePresence initial={false}>
              {mode === "login" && (
                <motion.div
                  key="login-id-field"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <label className="text-sm font-semibold text-slate-700" htmlFor="username">
                    Login ID
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={form.username}
                    onChange={(event) => updateField("username", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="mehrahimanshu"
                    required={mode === "login"}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4 overflow-hidden"
                >
                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                    Gmail address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="your@gmail.com"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="firstName">
                      First name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={(event) => updateField("firstName", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="lastName">
                      Last name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={(event) => updateField("lastName", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Enter password"
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isLoading || isUnlocking}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="relative min-h-12 w-full overflow-hidden rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_38px_rgba(15,23,42,0.25)] transition disabled:cursor-not-allowed disabled:opacity-80"
            >
              <motion.span
                aria-hidden="true"
                animate={isLoading || isUnlocking ? { x: ["-110%", "110%"] } : { x: "-110%" }}
                transition={{ duration: 1.1, repeat: isLoading || isUnlocking ? Infinity : 0, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)]"
              />
              <span className="relative z-10">
                {isUnlocking
                  ? "Opening workspace..."
                  : isLoading
                    ? "Checking access..."
                    : mode === "signup"
                      ? "Create account"
                      : "Log in"}
              </span>
            </motion.button>
          </form>
        </motion.section>
      </div>
    </motion.main>
  );
};

const TopBar = ({ user, onLogout }) => {
  const displayName = getDisplayName(user);
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 overflow-hidden border-b border-white/10 bg-slate-950 px-3 py-3 text-white shadow-[0_18px_60px_rgba(15,23,42,0.22)] sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,0.32),transparent_32%),radial-gradient(circle_at_78%_15%,rgba(249,115,22,0.24),transparent_30%),linear-gradient(90deg,rgba(15,23,42,0.95),rgba(17,94,89,0.84),rgba(15,23,42,0.98))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#38bdf8,#fb923c,#34d399,transparent)]"
      />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_16px_36px_rgba(14,165,233,0.18)] backdrop-blur">
            <span className="text-lg font-black tracking-tight">IS</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/80 sm:text-xs">
              Inbox Studio
            </p>
            <p className="truncate text-base font-semibold text-white sm:text-lg">
              Email Template Builder
            </p>
          </div>
          <div className="hidden rounded-full border border-emerald-300/25 bg-emerald-300/12 px-3 py-1 text-xs font-bold text-emerald-100 lg:block">
            Local AI ready
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-w-0 rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-right shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur sm:block">
            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>
            <p className="truncate text-xs text-cyan-100/72">{user?.email || user?.username}</p>
          </div>
          <div
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white text-sm font-black text-slate-950 shadow-[0_14px_35px_rgba(255,255,255,0.12)]"
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-2xl border border-white/14 bg-white/10 px-3 py-2 text-sm font-bold text-white shadow-[0_14px_36px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-orange-200/50 hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 sm:px-5"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [resetParams, setResetParams] = useState(() => readPasswordResetParams());

  useEffect(() => {
    const loadUser = async () => {
      if (!isAuthenticated()) {
        setIsBooting(false);
        return;
      }

      const currentUser = await fetchCurrentUser();
      if (currentUser && !currentUser.error) {
        setUser(currentUser);
      }
      setIsBooting(false);
    };

    loadUser();
  }, []);

  useEffect(() => {
    const syncResetParams = () => {
      setResetParams(readPasswordResetParams());
    };

    window.addEventListener("popstate", syncResetParams);
    window.addEventListener("hashchange", syncResetParams);
    return () => {
      window.removeEventListener("popstate", syncResetParams);
      window.removeEventListener("hashchange", syncResetParams);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const finishPasswordReset = () => {
    setResetParams(null);
    window.history.replaceState({}, "", window.location.pathname);
    setUser(null);
  };

  if (isBooting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid min-h-[100svh] place-items-center bg-slate-950 text-white"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
          Loading account
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {resetParams ? (
        <PasswordResetScreen
          key="password-reset"
          resetParams={resetParams}
          onComplete={finishPasswordReset}
        />
      ) : !user ? (
        <AuthScreen key="auth" onAuthenticated={setUser} />
      ) : (
        <motion.div key="builder" {...builderMotion}>
          <WorkspaceErrorBoundary>
            <TopBar user={user} onLogout={handleLogout} />
            <EmailBuilder currentUser={user} onLogoutSuccess={() => setUser(null)} />
          </WorkspaceErrorBoundary>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
