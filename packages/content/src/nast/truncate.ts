import { Root } from "./types.js";

export function truncateContent(tree: Root, maxLength = 256) {
  let length = 0;
  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i];

    switch (node.type) {
      case "hashtag":
        length += 1 + node.hashtag.length;
        break;
      case "mention":
        // guess user names are about 10 long
        length += 10;
        break;
      case "gallery":
        length += node.links.reduce((t, l) => t + l.length, 0);
        break;
      case "link":
      case "text":
        length += node.value.length;
        break;
      case "emoji":
        length += 1;
        break;
    }

    if (length > maxLength) {
      if (node.type === "text") {
        const children = i > 0 ? tree.children.slice(0, i) : [];
        const chunkLength = node.value.length - (length - maxLength);

        // find the nearest newline
        const newLines = node.value.matchAll(/\n/g);
        for (const match of newLines) {
          if (match.index && match.index > chunkLength) {
            children.push({ type: "text", value: node.value.slice(0, match.index) });
            return { ...tree, children, truncated: true };
          }
        }

        // just cut the string
        children.push({ type: "text", value: node.value.slice(0, maxLength - length) });
        return { ...tree, children, truncated: true };
      } else return { ...tree, children: tree.children.slice(0, i), truncated: true };
    }
  }
  return tree;
}
