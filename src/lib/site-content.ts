import { useSuspenseQuery } from "@tanstack/react-query";
import { siteContentQuery } from "./queries";

/**
 * Returns a getter for editable site texts, falling back to the built-in copy
 * when the key has not been customised in the dashboard yet.
 */
export function useSiteText() {
  const { data } = useSuspenseQuery(siteContentQuery);
  return (key: string, fallback: string) => {
    const value = data[key];
    return value && value.trim().length > 0 ? value : fallback;
  };
}
