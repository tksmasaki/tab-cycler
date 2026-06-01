import { describe, it, expect } from "vitest";
import { appendUnique, moveToFront, removeId } from "./mru-ops";

describe("moveToFront", () => {
  it("moves an existing id to the front without duplicating", () => {
    expect(moveToFront([1, 2, 3], 3)).toEqual([3, 1, 2]);
    expect(moveToFront([1, 2, 3], 2)).toEqual([2, 1, 3]);
  });

  it("prepends an id that is not present", () => {
    expect(moveToFront([1, 2], 9)).toEqual([9, 1, 2]);
  });

  it("handles an empty list", () => {
    expect(moveToFront([], 1)).toEqual([1]);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    moveToFront(input, 3);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("appendUnique", () => {
  it("appends an absent id to the end", () => {
    expect(appendUnique([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it("returns the same reference when the id is already present", () => {
    const input = [1, 2, 3];
    expect(appendUnique(input, 2)).toBe(input);
  });
});

describe("removeId", () => {
  it("removes every occurrence", () => {
    expect(removeId([1, 2, 1, 3], 1)).toEqual([2, 3]);
  });

  it("is a no-op for an absent id", () => {
    expect(removeId([1, 2, 3], 9)).toEqual([1, 2, 3]);
  });
});
