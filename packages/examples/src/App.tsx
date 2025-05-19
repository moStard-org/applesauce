import { useEffect, useState } from "react";
import SideNav from "./Nav";
import examples from "./examples";

function App() {
  const [source, setSource] = useState("");
  const [Example, setExample] = useState<(() => JSX.Element) | null>();

  // load selected example
  useEffect(() => {
    const listener = () => {
      const name = location.hash.replace(/^#/, "");
      const example = examples.find((e) => e.id === name);
      if (example) {
        setSource(example.path.replace(/^\.\//, ""));
        example.load().then((module: any) => {
          console.log("loaded", module.default);
          setExample(() => module.default);
        });
      }
    };

    listener();
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);

  return (
    <div className="drawer lg:drawer-open">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      {/* Navbar */}
      <div className="drawer-content flex flex-col">
        <div className="navbar bg-base-300 fixed top-0 z-50">
          <div className="flex-1">
            <span className="text-xl font-bold">Examples</span>
          </div>
          <div className="flex-none hidden sm:block">
            <a href="https://hzrd149.github.io/applesauce" className="btn btn-ghost text-white">
              Documentation
            </a>
            <a href="https://hzrd149.github.io/applesauce/typedoc/" className="btn btn-ghost text-white">
              Reference
            </a>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 pt-16">
          {Example ? (
            <div className="flex flex-col">
              <div className="p-4">
                <a
                  target="_blank"
                  href={`https://github.com/hzrd149/applesauce/tree/master/packages/examples/src/${source}`}
                  className="link link-primary"
                >
                  source code
                </a>
              </div>
              <div className="flex-1">
                <Example />
              </div>
            </div>
          ) : (
            <div className="p-4">Select example</div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <SideNav />
    </div>
  );
}

export default App;
