import { useState } from "react";
import examples from "../examples";

export default function SideNav() {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filtered = examples.filter((item) => item.id.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="drawer-side">
      <label htmlFor="drawer" className="drawer-overlay"></label>
      <div className="menu bg-base-200 text-base-content min-h-full">
        <input
          type="text"
          placeholder="Search..."
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ul className="menu menu-lg">
          {filtered.map((item) => (
            <li key={item.id}>
              <a href={"#" + item.id}>{item.id}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
