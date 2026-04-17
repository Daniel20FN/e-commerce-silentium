import { moveFileInList } from "./move_file_in_list";

const files = [
  { fileName: "first", id: "1", size: 10, url: "one" },
  { fileName: "second", id: "2", size: 10, url: "two" },
  { fileName: "third", id: "3", size: 10, url: "three" },
];

describe("moveFileInList", () => {
  it("moves file to requested index", () => {
    const result = moveFileInList(files, 0, 2);
    expect(result.map((file) => file.id)).toEqual(["2", "3", "1"]);
  });

  it("returns same order when indexes are invalid", () => {
    const result = moveFileInList(files, -1, 1);
    expect(result.map((file) => file.id)).toEqual(["1", "2", "3"]);
  });
});
