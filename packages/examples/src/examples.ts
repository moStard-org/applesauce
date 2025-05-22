const modules = import.meta.glob("./examples/**/*.tsx");
const sources = import.meta.glob("./examples/**/*.tsx", { query: "?raw" }) as Record<
  string,
  () => Promise<{ default: string }>
>;

function basename(path: string) {
  return path.split("/").pop()?.replace(/\..+$/, "") ?? "";
}

export type Example = {
  id: string;
  name: string;
  path: string;
  load: () => Promise<unknown>;
  source: () => Promise<string>;
};

const examples: Example[] = [];

for (const [path, load] of Object.entries(modules)) {
  const source = async () => (await sources[path]()).default as string;

  const id = basename(path);
  // Convert kebab-case or snake_case to Title Case
  const name = id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, "");

  examples.push({ id, name, path, load, source });
}

export default examples;
