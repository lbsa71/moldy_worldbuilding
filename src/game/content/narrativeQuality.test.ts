import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Compiler } from "../../inkjs/compiler/Compiler";
import inkSource from "../../ink/demo.ink?raw";
import {
  GROUNDED_POSITION_LIMIT,
  LIMINAL_POSITION_LIMIT,
  NARRATIVE_OBJECT_TYPES,
} from "./worldDesign";

type ParsedTag = {
  knot: string;
  key: string;
  rawValue: string;
};

function parseTags(source: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  let currentKnot = "global";

  for (const line of source.split(/\r?\n/)) {
    const knotMatch = line.match(/^===\s+([A-Za-z0-9_]+)\s+===/);
    if (knotMatch) {
      currentKnot = knotMatch[1];
      continue;
    }

    const tagMatch = line.match(/^#\s*([A-Za-z_]+):?\s*(.*)$/);
    if (tagMatch) {
      tags.push({
        knot: currentKnot,
        key: tagMatch[1],
        rawValue: tagMatch[2].trim(),
      });
    }
  }

  return tags;
}

describe("demo Ink content", () => {
  it("compiles before it reaches the game runtime", () => {
    expect(() => new Compiler(inkSource).Compile()).not.toThrow();
  });

  it("does not contain mojibake or replacement characters", () => {
    expect(inkSource).not.toMatch(/[\uFFFD\u00E2]/);
  });

  it("does not reuse long authored prose lines across different beats", () => {
    const authoredLines = inkSource
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 56)
      .filter((line) => !line.startsWith("//"))
      .filter((line) => !line.startsWith("#"))
      .filter((line) => !line.startsWith("*"))
      .filter((line) => !line.startsWith("+"))
      .map((line) => line.replace(/\s+/g, " "));

    const duplicates = authoredLines.filter(
      (line, index) => authoredLines.indexOf(line) !== index
    );

    expect([...new Set(duplicates)]).toEqual([]);
  });

  it("keeps spatial tags inside the authored liminal envelope", () => {
    const positionTags = parseTags(inkSource).filter(
      (tag) => tag.key === "position"
    );
    let offMapPositionCount = 0;

    expect(positionTags.length).toBeGreaterThan(0);

    for (const tag of positionTags) {
      const match = tag.rawValue.match(
        /^\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)$/
      );

      expect(
        match,
        `${tag.knot} has invalid position tag ${tag.rawValue}`
      ).not.toBeNull();

      if (!match) continue;

      const x = Number(match[1]);
      const z = Number(match[2]);

      if (
        Math.abs(x) > GROUNDED_POSITION_LIMIT ||
        Math.abs(z) > GROUNDED_POSITION_LIMIT
      ) {
        offMapPositionCount += 1;
      }

      expect(
        Math.abs(x),
        `${tag.knot} x position exceeds the liminal design envelope`
      ).toBeLessThanOrEqual(LIMINAL_POSITION_LIMIT);
      expect(
        Math.abs(z),
        `${tag.knot} z position exceeds the liminal design envelope`
      ).toBeLessThanOrEqual(LIMINAL_POSITION_LIMIT);
    }

    expect(offMapPositionCount).toBeGreaterThan(0);
  });

  it("references only implemented world objects and existing audio assets", () => {
    for (const tag of parseTags(inkSource)) {
      if (tag.key === "objects" && tag.rawValue.length > 0) {
        const objectNames = tag.rawValue
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);

        for (const objectName of objectNames) {
          expect(
            NARRATIVE_OBJECT_TYPES,
            `${tag.knot} references unknown object ${objectName}`
          ).toContain(objectName);
        }
      }

      if (tag.key === "audio") {
        const assetPath = join(process.cwd(), "public", "assets", tag.rawValue);
        expect(
          existsSync(assetPath),
          `${tag.knot} references missing audio ${tag.rawValue}`
        ).toBe(true);
      }
    }
  });

  it("has a complete sound arc from opening through credits", () => {
    const audioTags = new Set(
      parseTags(inkSource)
        .filter((tag) => tag.key === "audio")
        .map((tag) => tag.rawValue)
    );

    expect(audioTags).toEqual(
      new Set([
        "soundtrack_1.mp3",
        "soundtrack_2.mp3",
        "soundtrack_3.mp3",
        "end_credits.mp3",
      ])
    );
  });
});
