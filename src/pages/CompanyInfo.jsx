import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function CompanyInfo() {
  const [company, setCompany] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      const ref = doc(db, "company", "config");
      const snap = await getDoc(ref);
      if (snap.exists()) setCompany(snap.data());
    };
    fetchCompany();
  }, []);

  const handleChange = (e) => {
    setCompany({ ...company, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "company", "config"), company);
      alert("✅ Company info updated successfully!");
    } catch (e) {
      alert("❌ Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 flex items-center gap-2">
        🏢 Company Information
      </h2>

      <div className="bg-white p-6 rounded-lg shadow-md max-w-xl">
        <label className="block mb-2 font-semibold text-gray-700">
          Company Name
        </label>
        <input
          name="name"
          value={company.name}
          onChange={handleChange}
          className="w-full p-3 border rounded-lg mb-4"
          placeholder="Company name"
        />

        <label className="block mb-2 font-semibold text-gray-700">
          Address
        </label>
        <textarea
          name="address"
          value={company.address}
          onChange={handleChange}
          className="w-full p-3 border rounded-lg mb-4"
          placeholder="Address"
        />

        <label className="block mb-2 font-semibold text-gray-700">
          Phone
        </label>
        <input
          name="phone"
          value={company.phone}
          onChange={handleChange}
          className="w-full p-3 border rounded-lg mb-4"
          placeholder="Phone number"
        />

        <label className="block mb-2 font-semibold text-gray-700">
          Email
        </label>
        <input
          name="email"
          value={company.email}
          onChange={handleChange}
          className="w-full p-3 border rounded-lg mb-6"
          placeholder="Email address"
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow font-semibold"
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}
