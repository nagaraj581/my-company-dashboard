import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";

import Layout from "./components/Layout";

const MaterialRequest = lazy(() => import("./components/MaterialRequestForm"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Quotation = lazy(() => import("./pages/Quotation"));
const Invoice = lazy(() => import("./pages/Invoice"));
const Items = lazy(() => import("./pages/Items"));
const CompanyList = lazy(() => import("./pages/company/CompanyList"));
const Inventory = lazy(() => import("./pages/Inventory"));
const MaterialReceipt = lazy(() => import("./pages/MaterialReceipt"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectConsumption = lazy(() => import("./pages/ProjectConsumption"));
const Suppliers = lazy(() => import("./pages/Suppliers"));

function PageLoader() {
  return (
    <div className="flex min-h-72 items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 px-5 py-4 text-sm font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        Loading workspace...
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-600 mb-4">Loading workspace...</p>
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-indigo-100"></div>
        <div className="absolute -left-16 -top-14 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl"></div>
        <div className="absolute -right-20 -bottom-16 h-64 w-64 rounded-full bg-indigo-300/30 blur-3xl"></div>

        <div className="relative bg-white/90 border border-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)] w-[24rem] text-center">
          <h2 className="text-2xl font-extrabold text-sky-700 mb-6 tracking-tight">
            My Company Login
          </h2>

          <p className="text-slate-600 mb-6">
            Sign in with Google or Email to access your dashboard
          </p>

          <button
            onClick={async () => {
              try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
              } catch (err) {
                alert("Google login failed: " + err.message);
              }
            }}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 py-2.5 rounded-xl font-semibold mb-4 flex items-center justify-center gap-2 transition-all"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Sign in with Google
          </button>

          <div className="text-slate-400 text-sm my-3">or</div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await signInWithEmailAndPassword(auth, email, password);
              } catch (err) {
                alert("Email login failed: " + err.message);
              }
            }}
            className="space-y-3"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white py-2.5 rounded-xl font-semibold shadow-md transition-all"
            >
              Login with Email
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route element={<Layout user={user} onLogout={handleLogout} />}>
          <Route path="/" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="/material-request" element={<Suspense fallback={<PageLoader />}><MaterialRequest /></Suspense>} />
          <Route path="/material-receipt" element={<Suspense fallback={<PageLoader />}><MaterialReceipt /></Suspense>} />
          <Route path="/quotation" element={<Suspense fallback={<PageLoader />}><Quotation /></Suspense>} />
          <Route path="/invoice" element={<Suspense fallback={<PageLoader />}><Invoice /></Suspense>} />
          <Route path="/items" element={<Suspense fallback={<PageLoader />}><Items /></Suspense>} />
          <Route path="/suppliers" element={<Suspense fallback={<PageLoader />}><Suppliers /></Suspense>} />
          <Route path="/inventory" element={<Suspense fallback={<PageLoader />}><Inventory /></Suspense>} />
          <Route path="/projects" element={<Suspense fallback={<PageLoader />}><Projects /></Suspense>} />
          <Route path="/project-consumption" element={<Suspense fallback={<PageLoader />}><ProjectConsumption /></Suspense>} />
          <Route path="/company" element={<Suspense fallback={<PageLoader />}><CompanyList /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
