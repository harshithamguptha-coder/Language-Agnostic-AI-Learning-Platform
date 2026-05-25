import { useEffect, useState } from "react";

export default function PermissionsPage({ permissionsInput }) {
  const { idea, location } = permissionsInput || {};

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (idea && location) {
      fetchPermissions();
    }
  }, [idea, location]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:8000/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea, location }),
      });

      const data = await res.json();
      setPermissions(data.permissions || []);
    } catch (e) {
      console.error(e);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur-xl">
      <h2 className="text-2xl font-semibold text-white">
        Permissions Required
      </h2>

      <div className="flex flex-col gap-4 md:flex-row">
        <input
          value={idea || ""}
          className="rounded-xl bg-black/20 p-2 text-slate-100"
          readOnly
        />
        <input
          value={location || ""}
          className="rounded-xl bg-black/20 p-2 text-slate-100"
          readOnly
        />
      </div>

      {loading && <p className="text-slate-300">Fetching permissions...</p>}

      <div className="grid gap-4">
        {permissions.map((p, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="font-medium text-white">{p.name}</p>
            <a
              href={p.link}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-400"
            >
              Open Website -&gt;
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
