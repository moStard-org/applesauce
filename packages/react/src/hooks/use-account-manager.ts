import { useContext } from "react";
import type { AccountManager } from "applesauce-accounts";

import { AccountsContext } from "../providers/accounts-provider.js";

export function useAccountManager(): AccountManager;
export function useAccountManager(require: false): AccountManager | undefined;
export function useAccountManager(require: true): AccountManager;
export function useAccountManager(require = true): AccountManager | undefined {
	const manager = useContext(AccountsContext);
	if (!manager && require) throw new Error("Missing AccountsProvider");
	return manager;
}
