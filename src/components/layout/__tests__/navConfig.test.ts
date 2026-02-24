import { describe, it, expect } from "vitest";
import { topNavItems, techNavItems, navGroups } from "../navConfig";

describe("navConfig", () => {
  describe("topNavItems", () => {
    it("contains dashboard as first item", () => {
      expect(topNavItems[0].path).toBe("/dashboard");
      expect(topNavItems[0].label).toBe("Dashboard");
    });

    it("all items have required fields", () => {
      for (const item of topNavItems) {
        expect(item.path).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeDefined();
        expect(item.path.startsWith("/")).toBe(true);
      }
    });

    it("has no duplicate paths", () => {
      const paths = topNavItems.map((i) => i.path);
      expect(new Set(paths).size).toBe(paths.length);
    });
  });

  describe("techNavItems", () => {
    it("contains my-dashboard as first item", () => {
      expect(techNavItems[0].path).toBe("/my-dashboard");
    });

    it("all items have valid paths", () => {
      for (const item of techNavItems) {
        expect(item.path.startsWith("/")).toBe(true);
      }
    });
  });

  describe("navGroups", () => {
    it("has at least 5 groups", () => {
      expect(navGroups.length).toBeGreaterThanOrEqual(5);
    });

    it("operations group exists with items", () => {
      const ops = navGroups.find((g) => g.name === "operations");
      expect(ops).toBeDefined();
      expect(ops!.items.length).toBeGreaterThan(0);
    });

    it("all group items have unique paths within group", () => {
      for (const group of navGroups) {
        const paths = group.items.map((i) => i.path);
        expect(new Set(paths).size).toBe(paths.length);
      }
    });

    it("no path appears in both topNavItems and groups", () => {
      const topPaths = new Set(topNavItems.map((i) => i.path));
      for (const group of navGroups) {
        for (const item of group.items) {
          expect(topPaths.has(item.path)).toBe(false);
        }
      }
    });
  });
});
