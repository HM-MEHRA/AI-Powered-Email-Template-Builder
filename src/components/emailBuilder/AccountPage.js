import { motion } from "framer-motion";
import { buttonMotion, tabContentMotion } from "./motion";

const StatTile = ({ label, value }) => (
  <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-slate-950">{value ?? 0}</p>
  </div>
);

const InsightList = ({ label, items, emptyLabel }) => (
  <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">{label}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {items.length ? (
        items.map((item) => (
          <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
            {item}
          </span>
        ))
      ) : (
        <span className="text-sm text-slate-500">{emptyLabel}</span>
      )}
    </div>
  </section>
);

const AccountPage = ({
  accountStats,
  passwordForm,
  verificationStatus,
  onChangePassword,
  onExportAccountData,
  onImportTemplateFile,
  onPasswordFieldChange,
  onRequestPasswordReset,
  onRefreshAccountTools,
}) => (
  <motion.div key="account-tab" {...tabContentMotion} className="space-y-6">
    <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100">Account Tools</p>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-3xl">Export, import, and monitor your workspace.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Keep your saved templates portable, review usage, and handle basic account safety without leaving the app.
          </p>
        </div>
        <motion.button
          type="button"
          {...buttonMotion}
          onClick={onRefreshAccountTools}
          className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 lg:w-auto"
        >
          Refresh Stats
        </motion.button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Templates" value={accountStats?.templates} />
      <StatTile label="Archived" value={accountStats?.archived_templates} />
      <StatTile label="History" value={accountStats?.history} />
      <StatTile label="Shares" value={(accountStats?.shares_sent || 0) + (accountStats?.shares_received || 0)} />
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <InsightList
        label="Categories"
        items={accountStats?.categories || []}
        emptyLabel="No categories yet"
      />
      <InsightList
        label="Top Tones"
        items={(accountStats?.top_tones || []).map((item) => `${item.tone} (${item.count})`)}
        emptyLabel="No generation history yet"
      />
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Data Portability</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">Move your library safely</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Export your templates and history as JSON, or import templates from a previous export.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <motion.button
            type="button"
            {...buttonMotion}
            onClick={onExportAccountData}
            className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Export Data
          </motion.button>
          <label className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-semibold text-slate-800">
            Import Templates
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                onImportTemplateFile(event.target.files?.[0] || null);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Verification</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-950">Demo verification state</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {verificationStatus?.detail || "Verification status will appear here after refresh."}
        </p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</p>
          <p className="mt-2 break-words text-sm font-semibold text-slate-900">{verificationStatus?.email || "Not loaded"}</p>
        </div>
      </section>
    </div>

    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Password</p>
      <h3 className="mt-3 text-xl font-semibold text-slate-950">Change your password</h3>
      <form onSubmit={onChangePassword} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Current password</span>
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => onPasswordFieldChange("currentPassword", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">New password</span>
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => onPasswordFieldChange("newPassword", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
            required
          />
        </label>
        <motion.button
          type="submit"
          {...buttonMotion}
          className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
        >
          Update Password
        </motion.button>
      </form>
    </section>

    <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-[0_20px_60px_rgba(245,158,11,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Recovery</p>
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Password reset email</h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            {verificationStatus?.email_delivery_configured
              ? "Send a secure reset link to your account email. The link lets you set a new password without staying logged in."
              : "The account screen is ready for recovery, but email delivery needs SMTP/provider setup before this can send real reset links."}
          </p>
        </div>
        {verificationStatus?.email_delivery_configured ? (
          <motion.button
            type="button"
            {...buttonMotion}
            onClick={onRequestPasswordReset}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
          >
            Send Reset Email
          </motion.button>
        ) : (
          <button
            type="button"
            disabled
            className="rounded-full border border-amber-200 bg-white px-6 py-3 text-sm font-semibold text-amber-800 opacity-70"
          >
            SMTP Needed
          </button>
        )}
      </div>
    </section>
  </motion.div>
);

export default AccountPage;
