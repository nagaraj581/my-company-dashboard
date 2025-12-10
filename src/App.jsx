import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";

import Layout from "./components/Layout";
import MaterialRequest from "./components/MaterialRequestForm";
import Quotation from "./pages/Quotation";
import Invoice from "./pages/Invoice";
import Items from "./pages/Items";
import CompanyInfo from "./pages/CompanyInfo";
import CompanyList from "./pages/company/CompanyList";



export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Monitor Firebase Auth state
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
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Loading...</p>
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // If not logged in → show login UI
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-96 text-center">
          <h2 className="text-2xl font-bold text-blue-700 mb-6">
            🔐 My Company Login
          </h2>

          <p className="text-gray-600 mb-6">
            Sign in with Google or Email to access your dashboard
          </p>

          {/* Google Login */}
          <button
            onClick={async () => {
              try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
              } catch (err) {
                alert("Google login failed: " + err.message);
              }
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium mb-4 flex items-center justify-center gap-2"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="text-gray-400 text-sm my-3">— or —</div>

          {/* Email/Password Login */}
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
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full p-3 border rounded-lg"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
            >
              Login with Email
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If logged in → load dashboard
  return (
    <Router>
<Routes>
  <Route element={<Layout user={user} onLogout={handleLogout} />}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/material-request" element={<MaterialRequest />} />
    <Route path="/quotation" element={<Quotation />} />
    <Route path="/invoice" element={<Invoice />} />
    <Route path="/items" element={<Items />} />
    <Route path="/company-info" element={<CompanyInfo />} />  {/* ✅ Added */}
    <Route path="/company" element={<CompanyList />} />
  </Route>
</Routes>
    </Router>
  );
}

function Dashboard() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold mb-4">Welcome to Dashboard</h1>
      <p className="text-gray-600 text-lg">
        Select an option from the menu to get started.
      </p>
    </div>
  );
}
