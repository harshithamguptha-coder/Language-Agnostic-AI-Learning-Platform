import { useEffect, useState } from "react";

export default function PermissionsCard({ permissionsInput }) {
  const { idea, location } = permissionsInput;

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = async () => {
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
    setLoading(false);
  };

  useEffect(() => {
    if (idea && location) fetchPermissions();
  }, [idea, location]);

  return (
    <div className="p-4 border rounded-xl">
      <h2 className="text-lg font-bold mb-3">Permissions</h2>

      {loading ? (
        <p>Fetching permissions...</p>
      ) : (
        permissions.map((p, i) => (
          <div key={i} className="border p-3 rounded mb-2">
            <h3>{p.name}</h3>
            <p>{p.authority}</p>
            <a href={p.link} target="_blank">
              Visit Website
            </a>
          </div>
        ))
      )}
    </div>
  );
}