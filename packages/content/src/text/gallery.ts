import { Transformer } from "unified";
import { convertToUrl, getURLFilename, IMAGE_EXT } from "applesauce-core/helpers/url";

import { Link, Root } from "../nast/types.js";

/** Group images into galleries in an ATS tree */
export function galleries(types = IMAGE_EXT): Transformer<Root> {
  return (tree) => {
    let links: Link[] = [];

    const commit = (index: number) => {
      // only create a gallery if there are more than a single image
      if (links.length > 1) {
        const start = tree.children.indexOf(links[0]);
        const end = tree.children.indexOf(links[links.length - 1]);

        // replace all nodes with a gallery
        tree.children.splice(start, 1 + end - start, { type: "gallery", links: links.map((l) => l.href) });
        links = [];

        // return new cursor
        return end - 1;
      } else {
        links = [];
        return index;
      }
    };

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];

      try {
        if (node.type === "link") {
          const url = convertToUrl(node.href);
          const filename = getURLFilename(url);

          if (filename && types.some((ext) => filename.endsWith(ext))) {
            links.push(node);
          } else {
            i = commit(i);
          }
        } else if (node.type === "text" && links.length > 0) {
          const isEmpty = node.value === "\n" || !node.value.match(/[^\s]/g);

          if (!isEmpty) i = commit(i);
        }
      } catch (error) {
        i = commit(i);
      }
    }

    // Do one finally commit, just in case a link is the last element in the list
    commit(tree.children.length);
  };
}
