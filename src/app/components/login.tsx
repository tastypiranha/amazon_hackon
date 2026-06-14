import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Leaf, ArrowRight, Lock, Mail, Recycle, TrendingUp, Shield } from "lucide-react";
import rcLogo from "../../imports/images__1_.png";

const STATS = [
  { icon: Recycle,    value: "2.4M",  label: "Returns recirculated" },
  { icon: TrendingUp, value: "₹18Cr", label: "GMV recovered" },
  { icon: Shield,     value: "142t",  label: "CO₂ offset" },
];

import { useAuthContext } from "../../lib/AuthContext";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const { signIn, signUp } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    
    const result = await signIn(email, password);
    
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
    } else {
      onLogin();
    }
  };


  return (
    <div className="h-full flex">

      {/* ── Left panel (dark brand) ───────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] bg-[#0D1117] flex-col justify-between p-12 relative overflow-hidden">

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Glow blobs */}
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-[#FF9900]/8 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1 flex-shrink-0">
            <img src={rcLogo} alt="Amazon ReLife" className="w-full h-full object-contain" />
          </div>
          <span className="text-white text-lg font-bold tracking-tight">Amazon ReLife</span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
              Sustainable Commerce Platform
            </p>
            <h1 className="text-white text-4xl leading-tight mb-4">
              Close the loop on<br />every return.
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              ML-powered grading, instant P2P matching, and buyer-seller routing — all in one intelligent platform.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-white/5 border border-white/8 rounded-2xl p-4">
                <Icon className="w-4 h-4 text-emerald-400 mb-2" />
                <p className="text-white text-xl font-black tracking-tight">{value}</p>
                <p className="text-gray-500 text-[10px] mt-0.5 leading-snug">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Testimonial */}
          <motion.div
            className="bg-white/5 border border-white/8 rounded-2xl p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-gray-300 text-sm leading-relaxed italic">
              "Amazon ReLife cut our return rate by 34% in the first quarter. The ML intercept alone paid for the platform."
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-emerald-400 text-[11px] font-bold">★</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Head of Operations</p>
                <p className="text-gray-500 text-[10px]">Leading E-commerce Platform, India</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="relative flex items-center gap-2">
          <Leaf className="w-3.5 h-3.5 text-emerald-500" />
          <p className="text-gray-600 text-xs">Carbon-neutral certified · ISO 14001</p>
        </div>
      </div>

      {/* ── Right panel (form) ────────────────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col justify-center items-center px-8 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-[#0D1117] flex items-center justify-center p-1">
              <img src={rcLogo} alt="Amazon ReLife" className="w-full h-full object-contain invert" />
            </div>
            <span className="text-gray-900 text-base font-bold">Amazon ReLife</span>
          </div>

          <div className="mb-8">
            <h2 className="text-gray-900 text-2xl font-bold mb-1.5">Welcome back</h2>
            <p className="text-gray-400 text-sm">Sign in to your Amazon ReLife account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@company.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest">
                  Password
                </label>
                <button type="button" className="text-xs text-[#FF9900] font-semibold hover:underline cursor-pointer">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  className="text-red-600 text-xs font-medium"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#FF9900] hover:bg-amber-500 disabled:bg-amber-300 text-gray-900 font-bold rounded-xl py-3.5 text-sm cursor-pointer transition-colors mt-2"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-gray-900/30 border-t-gray-900"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* SSO */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Google", icon: "G" },
              { label: "Microsoft", icon: "M" },
            ].map(({ label, icon }) => (
              <button
                key={label}
                onClick={onLogin}
                className="flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium text-gray-600 cursor-pointer transition-colors"
              >
                <span className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600">
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </div>

          {/* Sign up */}
          <p className="text-center text-xs text-gray-400 mt-8">
            Don't have an account?{" "}
            <button className="text-[#FF9900] font-semibold hover:underline cursor-pointer">
              Request access
            </button>
          </p>

          {/* Demo hint */}
          <motion.div
            className="mt-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-2.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-700">Demo mode</strong> — enter any email and password to explore the platform.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
