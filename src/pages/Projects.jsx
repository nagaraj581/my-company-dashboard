import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "projects"), (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(list);
    });

    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return alert("Project name required");

    await addDoc(collection(db, "projects"), {
      name,
      location,
      status: "ACTIVE",
      createdAt: new Date(),
    });

    setName("");
    setLocation("");
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        ?? Projects
      </h2>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-3 border rounded"
          />
          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="p-3 border rounded"
          />
        </div>

        <button
          onClick={handleAdd}
          className="w-full bg-purple-600 text-white py-3 rounded font-semibold"
        >
          ? Add Project
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        {projects.length === 0 ? (
          <p>No projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li
                key={p.id}
                className="p-3 border rounded flex justify-between"
              >
                <span>
                  {p.name} — {p.location || "No location"}
                </span>
                <span className="text-sm text-green-600">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
