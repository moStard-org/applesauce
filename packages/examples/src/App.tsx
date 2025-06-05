import Prism from "prismjs";
import "prismjs/themes/prism.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import SideNav from "./components/Nav";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";

Prism.manual = true;

import examples, { Example } from "./examples";

function CodeBlock({ code, language }: { code: string; language: string }) {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current);
  }, []);

  return (
    <pre className="p-4">
      <code ref={ref} className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
}

function ExampleView({ example }: { example: Example }) {
  const [path, setPath] = useState("");
  const [source, setSource] = useState("");
  const [Component, setComponent] = useState<(() => JSX.Element) | null>();

  const [mode, setMode] = useState<"code" | "preview">("preview");

  // set mode to preview when example changes
  useEffect(() => setMode("preview"), [example]);

  // load selected example
  useEffect(() => {
    setPath(example.path.replace(/^\.\//, ""));
    example.load().then((module: any) => {
      console.log("loaded", module.default);
      setComponent(() => module.default);
    });

    example.source().then((source: string) => {
      setSource(source);
    });
  }, [example]);

  return (
    <div className="drawer lg:drawer-open">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      {/* Navbar */}
      <div className="drawer-content flex flex-col">
        <div className="navbar bg-base-300 fixed top-0 z-50">
          <span className="text-xl font-bold">{example.name}</span>

          <div className="flex-none flex gap-2 ms-4">
            <label className="label">
              <input
                type="checkbox"
                checked={mode === "code"}
                onChange={() => setMode(mode === "code" ? "preview" : "code")}
                className="toggle toggle-sm"
              />
              Code
            </label>

            <ul className="menu menu-horizontal px-1">
              <li>
                <a
                  target="_blank"
                  className="btn btn-ghost btn-sm btn-square"
                  href={`https://github.com/hzrd149/applesauce/tree/master/packages/examples/src/${path}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                    />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="h-14"></div>

        {/* Main content */}
        {mode === "preview" ? (
          Component ? (
            <div className="flex-1 flex flex-col">
              <Component />
            </div>
          ) : (
            <span className="loading loading-dots loading-xl"></span>
          )
        ) : (
          <CodeBlock code={source} language="tsx" />
        )}
      </div>

      {/* Sidebar */}
      <SideNav />
    </div>
  );
}

function HomeView() {
  return (
    <div className="container mx-auto">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Applesauce Examples</a>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
            <li>
              <a href="https://hzrd149.github.io/applesauce">Documentation</a>
            </li>
            <li>
              <a href="https://hzrd149.github.io/applesauce/typedoc/">Reference</a>
            </li>
            <li>
              <a href="https://github.com/hzrd149/applesauce">GitHub</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {examples.map((example) => (
          <a
            key={example.id}
            href={`#${example.id}`}
            className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow"
          >
            <div className="card-body">
              <h2 className="card-title">{example.name}</h2>
              <p className="text-sm opacity-70">{example.id}</p>
              <div className="card-actions justify-end mt-2">
                <button className="btn btn-primary btn-sm">View Example</button>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [example, setExample] = useState<Example | null>();

  // load selected example
  useEffect(() => {
    const listener = () => {
      const name = location.hash.replace(/^#/, "");
      const example = examples.find((e) => e.id === name);
      if (example) setExample(example);
      else setExample(null);
    };

    listener();
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);

  if (!example) return <HomeView />;
  else return <ExampleView example={example} />;
}

export default App;
