import { useEffect, useMemo, useState } from "react";
import { addDoc, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { Building2, MapPin, Plus, Search } from "lucide-react";
import { getCurrentUserId, userCollection } from "../services/userDb";
import { useCurrency } from "../context/useCurrency";

export default function Projects() {
  const { currency } = useCurrency();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setProjects([]);
      return undefined;
    }
    setLoading(true);

    const projectsQuery = query(
      userCollection("projects", userId),
      where("currency", "==", currency)
    );
    const unsub = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setProjects(list);
        setLoading(false);
      },
      (error) => {
        console.error("Unable to load projects:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [currency]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter(project => {
        if (statusFilter === "ALL") return true;
        return project.status === statusFilter;
      })
      .filter(project => {
        const term = searchTerm.toLowerCase();
        return (
          project.name.toLowerCase().includes(term) ||
          (project.location || "").toLowerCase().includes(term)
        );
      });
  }, [projects, searchTerm, statusFilter]);

  const handleAdd = async () => {
    if (!name.trim()) return alert("Project name required");
    const userId = getCurrentUserId();
    if (!userId) return alert("You must be signed in");

    try {
      setIsSaving(true);
      await addDoc(userCollection("projects", userId), {
        name: name.trim(),
        location: location.trim(),
        currency,
        status: "ACTIVE",
        createdAt: serverTimestamp(),
      });

      setName("");
      setLocation("");
    } catch (error) {
      console.error("Unable to add project:", error);
      alert(`Unable to add project: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold bg-gradient-to-r from-violet-600 to-sky-600 bg-clip-text text-transparent">
            <Building2 className="text-violet-600" size={30} />
            Projects
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Active work sites and project locations.
          </p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-violet-700 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
          <div className="text-2xl font-extrabold">{filteredProjects.length}</div>
          <div className="text-xs font-bold uppercase">Active Projects</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
          <input
            placeholder="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={18} />
            {isSaving ? "Adding..." : "Add Project"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            placeholder="Search by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-10 text-center text-slate-500 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75 dark:text-slate-400 md:col-span-2 xl:col-span-3">
            No projects match your search.
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/70 dark:bg-slate-900/75"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-slate-950 dark:text-white">
                    {project.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin size={15} />
                    <span className="truncate">{project.location || "No location"}</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {project.status || "ACTIVE"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 via-sky-500 to-emerald-500" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
