import { useState } from "react";
import { useAsync } from "react-use";
import { EventFactory } from "applesauce-factory";
import JsonBlock from "../components/json-block";

const factory = new EventFactory();

export default function NoteBlueprintExample() {
  const [input, setInput] = useState<string>("");
  const { value: output } = useAsync(() => factory.note(input), [input]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">NoteBlueprint</h1>

      <textarea
        className="textarea textarea-bordered w-full h-48 mb-4"
        placeholder="Enter text here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <h2 className="text-xl font-semibold mb-2">Event template</h2>
      {output && <JsonBlock value={output} />}
    </div>
  );
}
