import { useEffect, useState } from "react";

export default function PermissionsCard({ permissionsInput }) {
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
        body: JSON.stringify({
          idea,
          location,
        }),
      });

      const data = await res.json();
      setPermissions(data.permissions || []);
    } catch (err) {
      console.error("Permissions error:", err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        Permissions Required
      </h2>

      {loading && (
        <p className="text-sm text-gray-400">
          Fetching permissions...
        </p>
      )}

      {!loading && permissions.length > 0 && (
        <div className="flex flex-col gap-3">
          {permissions.map((permission, index) => (
            <div key={index} className="p-3 rounded-xl bg-black/30">
              <p className="font-medium">{permission.name}</p>
              <p className="text-sm text-gray-400">{permission.authority}</p>
              <a
                href={permission.link}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 text-sm"
              >
                Visit Website
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
