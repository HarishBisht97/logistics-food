import raw from "../data/menu.json";
import type { MenuItem, VegFilter } from "../types";

export const MENU = raw as MenuItem[];

export type MenuGroup = {
  cat: string;
  subs: { sub: string; items: MenuItem[] }[];
};

/** Groups by cat, then sub, keeping the order they first appear in the file. */
export function groupMenu(items: readonly MenuItem[]): MenuGroup[] {
  const cats: MenuGroup[] = [];
  for (const item of items) {
    let cat = cats.find((entry) => entry.cat === item.cat);
    if (!cat) {
      cat = { cat: item.cat, subs: [] };
      cats.push(cat);
    }
    let sub = cat.subs.find((entry) => entry.sub === item.sub);
    if (!sub) {
      sub = { sub: item.sub, items: [] };
      cat.subs.push(sub);
    }
    sub.items.push(item);
  }
  return cats;
}

export function filterMenu(
  items: readonly MenuItem[],
  query: string,
  veg: VegFilter,
): MenuItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter((item) => {
    if (veg === "veg" && !item.veg) return false;
    if (veg === "nonveg" && item.veg) return false;
    if (needle && !item.name.toLowerCase().includes(needle)) return false;
    return true;
  });
}

const byId = new Map(MENU.map((item) => [String(item.id), item]));

export function menuItem(id: string): MenuItem | undefined {
  return byId.get(id);
}

export function priceOf(id: string): number {
  return byId.get(id)?.price ?? 0;
}
