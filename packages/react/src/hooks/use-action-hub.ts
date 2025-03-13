import { useContext } from "react";
import { ActionsContext } from "../providers/actions-provider.js";

export function useActionHub() {
  const hub = useContext(ActionsContext);
  if (!hub) throw new Error("Missing ActionsProvider");
  return hub;
}
