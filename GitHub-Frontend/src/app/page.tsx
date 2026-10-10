'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../lib/api/client';
import {
  Github,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Loader2,
  KeyRound,
  Sparkles,
  User,
  Phone,
  MessageSquare,
  CheckCircle2,
  X,
  ChevronRight,
  Activity,
  BarChart3,
  GitPullRequest,
  GitCommit,
  Cpu,
  Layers,
  Zap,
  Building2,
  Bot,
  Check,
  ShieldAlert,
  Server,
  Terminal,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';

export default function LandingPage() {
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const router = useRouter();

  // Modals state
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  // Sign In Form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Demo Access (Sign Up) Form state
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoDescription, setDemoDescription] = useState('');
  const [demoError, setDemoError] = useState<string | null>(null);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoSubmittedSuccess, setDemoSubmittedSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setIsSubmittingLogin(true);
    const result = await login(loginEmail, loginPassword);
    setIsSubmittingLogin(false);

    if (!result.success) {
      setLoginError(result.error || 'Invalid email or password. Access denied.');
    }
  };

  // Handle Demo Request Submission
  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoError(null);

    if (!demoName.trim()) {
      setDemoError('Please enter your full name.');
      return;
    }

    const trimmedEmail = demoEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setDemoError('Please enter your email address.');
      return;
    }

    // Verify @gmail.com domain
    if (!trimmedEmail.endsWith('@gmail.com') || trimmedEmail.length <= 10) {
      setDemoError('Only valid Gmail addresses (@gmail.com) are accepted for demo access requests.');
      return;
    }

    setIsSubmittingDemo(true);
    try {
      const res = await fetchApi<any>('/demo-requests', {
        method: 'POST',
        body: JSON.stringify({
          name: demoName.trim(),
          email: trimmedEmail,
          phone: demoPhone.trim(),
          description: demoDescription.trim(),
        }),
      });

      setIsSubmittingDemo(false);
      if (res.success) {
        setSubmittedEmail(trimmedEmail);
        setDemoSubmittedSuccess(true);
      } else {
        setDemoError(res.error || 'Failed to submit request. Please try again.');
      }
    } catch (err: any) {
      setIsSubmittingDemo(false);
      setDemoError(err.message || 'Only valid Gmail addresses (@gmail.com) are accepted for demo access requests.');
    }
  };

  const resetDemoModal = () => {
    setIsSignUpOpen(false);
    setDemoSubmittedSuccess(false);
    setDemoName('');
    setDemoEmail('');
    setDemoPhone('');
    setDemoDescription('');
    setDemoError(null);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans overflow-x-hidden">
      {/* Decorative Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-blue-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-96 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60 backdrop-blur-md">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-500" />
            <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-blue-400">
              <Github className="w-6 h-6" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
              GitMonitor <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
            </span>
            <span className="text-[10px] text-slate-400 block font-medium -mt-1">Engineering Intelligence Platform</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Go to Dashboard</span>
              </button>
              <button
                onClick={() => logout()}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsSignInOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => setIsSignUpOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Request Demo Access</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-12 space-y-20">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-4xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Multi-Tenant Engineering Intelligence & AI Copilot</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            GitHub Project Monitoring &{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              AI Code Telemetry
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            Monitor developer velocity, track code churn across multi-tenant repositories, analyze PR resolution cycles, and query codebase intelligence with an AI agent.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            {isAuthenticated ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer group"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsSignUpOpen(true)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span>Get Demo Access</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setIsSignInOpen(true)}
                  className="w-full sm:w-auto px-8 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 font-bold rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  <span>Sign In to Console</span>
                </button>
              </>
            )}
          </div>

          {/* Key Trust Stats */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-800/80">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
              <div className="text-2xl font-black text-white">100%</div>
              <div className="text-[11px] text-slate-400 font-medium">Data Security</div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
              <div className="text-2xl font-black text-blue-400">Sub-1s</div>
              <div className="text-[11px] text-slate-400 font-medium">AI Agent Routing</div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
              <div className="text-2xl font-black text-indigo-400">8 Tabs</div>
              <div className="text-[11px] text-slate-400 font-medium">Project Telemetry</div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
              <div className="text-2xl font-black text-emerald-400">SaaS Isolation</div>
              <div className="text-[11px] text-slate-400 font-medium">Multi-Tenant Boundaries</div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Built for Engineering Teams & Leadership
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Transform raw GitHub API webhooks into actionable engineering telemetry and AI-driven reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 space-y-4 hover:border-blue-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">LangGraph Multi-Agent Copilot</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Natural-language codebase querying with specialized sub-agents for Repositories, PRs, Developers, Code Churn, and Automated Reports.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 space-y-4 hover:border-indigo-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Strict SaaS Multi-Tenant Isolation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cryptographic organization foreign-key boundaries isolate data across tenants, allowing safe multi-repo monitoring without cross-tenant leaks.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 space-y-4 hover:border-emerald-500/50 transition-all shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Data Integrity & Guardrails</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-execution prompt inspection blocks prompt injection, secret exfiltration, and unauthorized actions.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-900/40 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Ready to Upgrade Your Engineering Intelligence?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Request demo access today. Our system administrator will review your application and send your login credentials directly to your verified Gmail address.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setIsSignUpOpen(true)}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Request Demo Access</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-800/80 bg-slate-950/90 py-8 px-6 text-center text-xs text-slate-500 space-y-2">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-400" /> GitMonitor AI Enterprise SaaS Platform | Powered by Neon DB & LangGraph
        </p>
        <p className="text-[11px] text-slate-600">© 2026 GitMonitor AI Inc. All rights reserved. GitHub Project Monitoring Platform.</p>
      </footer>

      {/* ========================================================================= */}
      {/* 1. SIGN IN MODAL */}
      {/* ========================================================================= */}
      {isSignInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setIsSignInOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Console Sign In</h3>
                <p className="text-xs text-slate-400">Enter your account credentials to access platform</p>
              </div>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{loginError}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="user@organization.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingLogin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800">
              Need access?{' '}
              <button
                onClick={() => {
                  setIsSignInOpen(false);
                  setIsSignUpOpen(true);
                }}
                className="text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Request Demo Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SIGN UP / DEMO ACCESS REQUEST MODAL */}
      {/* ========================================================================= */}
      {isSignUpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <button
              onClick={resetDemoModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!demoSubmittedSuccess ? (
              <>
                {/* Modal Header */}
                <div className="space-y-1.5 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">
                      Request Demo Access
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Apply for executive evaluation access to the GitMonitor AI platform.
                  </p>
                </div>

                {/* Important Notice Banner */}
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Credential Delivery Notice</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Your login credentials (User ID and Password) will be reviewed by the system administrator and sent directly to your verified Gmail address.
                  </p>
                </div>

                {/* Error Banner */}
                {demoError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 font-semibold">{demoError}</div>
                  </div>
                )}

                {/* Demo Request Form */}
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={demoName}
                        onChange={(e) => setDemoName(e.target.value)}
                        placeholder="e.g. Alex Mercer"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Gmail Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Gmail Address <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                        Gmail Only (@gmail.com)
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={demoEmail}
                        onChange={(e) => setDemoEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={demoPhone}
                        onChange={(e) => setDemoPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Description / Requirements Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Why do you need access? (Team & Requirements)
                    </label>
                    <textarea
                      rows={3}
                      value={demoDescription}
                      onChange={(e) => setDemoDescription(e.target.value)}
                      placeholder="Why do you need this access? Tell us about your engineering team, project size, and key questions you want GitMonitor AI to answer..."
                      className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingDemo}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isSubmittingDemo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Submit Demo Request</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Success Confirmation View */
              <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-xl">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" style={{ animationDuration: '2s' }} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Your response was received!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Your demo request has been registered in our database. Our system administrator will review your application and send your executive login credentials to <span className="font-bold text-emerald-400">{submittedEmail}</span>.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Next Steps:</div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Admin manually verifies your Gmail address and configures your tenant org.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>You will receive an email containing your temporary User ID and Password.</span>
                  </div>
                </div>

                <button
                  onClick={resetDemoModal}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
