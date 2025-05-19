import { useState } from "react";
import { useAsync } from "react-use";
import { EventFactory } from "applesauce-factory";
import JsonBlock from "../components/json-block";

const factory = new EventFactory();

const parent = {
  content: "Nostr is a new programming language.",
  created_at: 1737334002,
  id: "efb83177e63bffb73ad6a39b09f10e693bb2c569e90aa7e17a2294feb7a75632",
  kind: 1,
  pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
  sig: "3d7a5958e6a4750a61df5c1d4dd4b9ffd272fc2912d22d56e1e4cd2c242cfdeb83ce8cbcd052817c1c240e93bc90b5e67b2dee5dc169ec14117636625565c4d9",
  tags: [],
};

// TODO: convert this to a simple thread renderer
export default function NoteReplyBlueprintExample() {
  const [input, setInput] = useState<string>("");
  const { value: output } = useAsync(() => factory.noteReply(parent, input), [input]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Note Reply blueprint</h1>

      <textarea
        className="textarea textarea-bordered w-full h-36"
        placeholder="Enter text here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <h2 className="text-xl font-semibold mt-6 mb-3">Event template</h2>
      {output && <JsonBlock value={output} />}

      <h2 className="text-xl font-semibold mt-6 mb-3">Parent event</h2>
      <JsonBlock value={parent} />
    </div>
  );
}
