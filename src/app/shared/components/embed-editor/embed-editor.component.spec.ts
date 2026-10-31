import { SimpleChange } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { EmbedEditorComponent } from "./embed-editor.component";

describe("EmbedEditorComponent", () => {
	function component(embedJson = "", allowCustomEmbeds = false) {
		const fixture = TestBed.createComponent(EmbedEditorComponent);
		const instance = fixture.componentInstance;
		instance.embedJson = embedJson;
		instance.allowCustomEmbeds = allowCustomEmbeds;
		fixture.detectChanges();
		return instance;
	}

	it("starts in editor mode with the incoming JSON parsed", () => {
		const instance = component('{"title":"Hello"}');
		expect(instance.mode).toBe("editor");
		expect(instance.rawText).toBe('{"title":"Hello"}');
		expect(instance.parseError).toBeNull();
		expect(instance.entries).toHaveLength(1);
		expect(instance.entries[0].title).toBe("Hello");
	});

	it("treats blank input as valid and empty", () => {
		const instance = component("  ");
		expect(instance.mode).toBe("editor");
		expect(instance.entries).toEqual([]);
		expect(instance.parseError).toBeNull();
	});

	it("keeps raw mode and reports an error for invalid JSON", () => {
		const instance = component("{oops");
		expect(instance.mode).toBe("raw");
		expect(instance.entries).toEqual([]);
		expect(instance.parseError).toContain("Invalid JSON");
	});

	it("rejects null as embed root without throwing", () => {
		const instance = component("null");
		expect(instance.mode).toBe("raw");
		expect(instance.parseError).toContain("not null");
	});

	it("parses a single object into one editor entry", () => {
		const instance = component(
			JSON.stringify({ title: "T", description: "D" }),
		);
		expect(instance.mode).toBe("editor");
		expect(instance.entries).toHaveLength(1);
		expect(instance.entries[0].title).toBe("T");
		expect(instance.entries[0].description).toBe("D");
	});

	it("parses an array into ordered entries", () => {
		const instance = component(
			JSON.stringify([{ title: "A" }, { title: "B" }]),
		);
		expect(instance.entries.map((entry) => entry.title)).toEqual(["A", "B"]);
	});

	it("preserves the single-object shape when serializing back", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		instance.addEntry();
		const serialized = JSON.parse(instance.serialize());
		expect(Array.isArray(serialized)).toBe(true);
		expect(serialized).toHaveLength(2);
	});

	it("keeps array shape even for a single remaining entry", () => {
		const instance = component(
			JSON.stringify([{ title: "A" }, { title: "B" }]),
		);
		instance.removeEntry(instance.entries[1]);
		const serialized = JSON.parse(instance.serialize());
		expect(Array.isArray(serialized)).toBe(true);
		expect(serialized.map((embed: { title?: string }) => embed.title)).toEqual([
			"A",
		]);
	});

	it("adds an entry at the end and notifies the host form", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		instance.addEntry();
		expect(instance.entries).toHaveLength(2);
		expect(instance.entries[1].title).toBeNull();
		expect(instance.embedJson).toBe(
			JSON.stringify([{ title: "A" }, {}], null, 2),
		);
	});

	it("deletes an entry by its delete action", () => {
		const instance = component(
			JSON.stringify([{ title: "A" }, { title: "B" }]),
		);
		instance.removeEntry(instance.entries[0]);
		expect(instance.entries.map((entry) => entry.title)).toEqual(["B"]);
	});

	it("ignores removals for entries no longer present", () => {
		const instance = component(JSON.stringify([{ title: "A" }]));
		const detached = { ...instance.entries[0] };
		instance.removeEntry(instance.entries[0]);
		instance.removeEntry(detached);
		expect(instance.entries).toEqual([]);
	});

	it("reorders entries with move up and down", () => {
		const instance = component(
			JSON.stringify([{ title: "A" }, { title: "B" }, { title: "C" }]),
		);
		instance.moveEntry(instance.entries[2], -1);
		expect(instance.entries.map((entry) => entry.title)).toEqual([
			"A",
			"C",
			"B",
		]);
		instance.moveEntry(instance.entries[0], 1);
		expect(instance.entries.map((entry) => entry.title)).toEqual([
			"C",
			"A",
			"B",
		]);
	});

	it("clamps moves at the list boundaries without duplicating", () => {
		const instance = component(
			JSON.stringify([{ title: "A" }, { title: "B" }]),
		);
		instance.moveEntry(instance.entries[0], -1);
		expect(instance.entries.map((entry) => entry.title)).toEqual(["A", "B"]);
		instance.moveEntry(instance.entries[1], 1);
		expect(instance.entries.map((entry) => entry.title)).toEqual(["A", "B"]);
	});

	it("adds, moves and deletes fields inside an entry", () => {
		const instance = component(
			JSON.stringify({ fields: [{ name: "n1", value: "v1", inline: false }] }),
		);
		const entry = instance.entries[0];

		instance.addField(entry);
		expect(entry.fields).toHaveLength(2);
		expect(entry.fields[1].name).toBe("");

		instance.moveField(entry, entry.fields[0], 1);
		expect(entry.fields.map((field) => field.name)).toEqual(["", "n1"]);

		instance.removeField(entry, entry.fields[0]);
		expect(entry.fields.map((field) => field.name)).toEqual(["n1"]);
	});

	it("round-trips the full embed schema without losing values", () => {
		const embed = {
			title: "t",
			description: "d",
			url: "u",
			timestamp: 1732920448245,
			color: "#A51770",
			image: "i",
			footer: { text: "f", icon: "fi" },
			thumbnail: { url: "th" },
			author: { name: "a", url: "au", icon: "ai" },
			fields: [{ name: "fn", value: "fv", inline: true }],
		};
		const instance = component(JSON.stringify(embed));
		expect(JSON.parse(instance.serialize())).toEqual(embed);
	});

	it("keeps author short form as a string when it was a string", () => {
		const instance = component(JSON.stringify({ author: "Someone" }));
		expect(instance.entries[0].authorAsString).toBe(true);
		expect(instance.entries[0].authorName).toBe("Someone");
		expect(JSON.parse(instance.serialize()).author).toBe("Someone");
	});

	it("keeps string timestamps as strings when serializing back", () => {
		const instance = component(JSON.stringify({ timestamp: "not-a-number" }));
		expect(instance.entries[0].timestamp).toBe("not-a-number");
		expect(JSON.parse(instance.serialize())).toEqual({
			timestamp: "not-a-number",
		});
	});

	it("parses numeric timestamps into editor-safe text", () => {
		const instance = component(JSON.stringify({ timestamp: 42 }));
		expect(instance.entries[0].timestamp).toBe("42");
		expect(JSON.parse(instance.serialize())).toEqual({ timestamp: 42 });
	});

	it("preserves unknown properties through the extras map", () => {
		const instance = component(JSON.stringify({ title: "t", weird: { a: 1 } }));
		expect(instance.entries[0].extras).toEqual({ weird: { a: 1 } });
		expect(JSON.parse(instance.serialize())).toEqual({
			title: "t",
			weird: { a: 1 },
		});
	});

	it("preserves unknown nested properties in footer, thumbnail and author", () => {
		const embed = {
			footer: { text: "f", extra: 1 },
			thumbnail: { url: "t", extra: 2 },
			author: { name: "a", extra: 3 },
		};
		const instance = component(JSON.stringify(embed));
		expect(instance.entries[0].footerExtras).toEqual({ extra: 1 });
		expect(instance.entries[0].thumbnailExtras).toEqual({ extra: 2 });
		expect(instance.entries[0].authorExtras).toEqual({ extra: 3 });
		expect(JSON.parse(instance.serialize())).toEqual(embed);
	});

	it.each([
		[{ footer: "broken" }, '"footer" must be an object.'],
		[{ thumbnail: ["x"] }, '"thumbnail" must be an object.'],
		[{ author: 5 }, '"author" must be an object or a string.'],
		[{ fields: "no" }, '"fields" must be an array.'],
		[{ color: 16711680 }, '"color" must be a string.'],
		[{ title: 1 }, '"title" must be a string.'],
		[{ timestamp: true }, '"timestamp" must be a number or a string.'],
		[{ footer: { text: 1 } }, '"footer.text" must be a string.'],
		[{ fields: ["bad"] }, '"fields[0]" must be an object.'],
		[
			{ fields: [{ name: 1, value: "v" }] },
			'"fields[0].name" must be a string.',
		],
		[
			{ fields: [{ name: "n", value: "v", inline: "yes" }] },
			'"fields[0].inline" must be true or false.',
		],
	])(
		"refuses the visual editor for %j with a clear error",
		(embed, message) => {
			const json = JSON.stringify(embed);
			const instance = component(json);
			expect(instance.mode).toBe("raw");
			expect(instance.parseError).toContain(message);
			expect(instance.rawText).toBe(json);
			instance.toggleMode();
			expect(instance.mode).toBe("raw");
			expect(instance.parseError).toContain(message);
		},
	);

	it("names the failing embed when there are several", () => {
		const instance = component(JSON.stringify([{ title: "A" }, { color: 1 }]));
		expect(instance.parseError).toContain('Embed 2: "color" must be a string.');
	});

	it("preserves unknown field properties", () => {
		const embed = {
			fields: [{ name: "n", value: "v", inline: true, emoji: "x" }],
		};
		const instance = component(JSON.stringify(embed));
		expect(instance.entries[0].fields[0].extras).toEqual({ emoji: "x" });
		instance.entries[0].fields[0].name = "m";
		expect(JSON.parse(instance.embedJson)).toEqual({
			fields: [{ name: "m", value: "v", inline: true, emoji: "x" }],
		});
	});

	it("supports custom embeds when the host allows them", () => {
		const instance = component(
			JSON.stringify(["ticket-panel", { customEmbed: "x", customData: "y" }]),
			true,
		);
		expect(instance.entries).toHaveLength(2);
		expect(instance.entries[0].kind).toBe("custom");
		expect(instance.entries[0].customType).toBe("ticket-panel");
		expect(instance.entries[1].customData).toBe("y");
		expect(JSON.parse(instance.serialize())).toEqual([
			"ticket-panel",
			{ customEmbed: "x", customData: "y" },
		]);
	});

	it("rejects custom embeds when the host does not allow them", () => {
		const instance = component(JSON.stringify(["ticket-panel"]));
		expect(instance.mode).toBe("raw");
		expect(instance.parseError).toContain("custom embeds");
	});

	it("leaves custom embeds without a type out of the JSON", () => {
		const instance = component(JSON.stringify({ customEmbed: "x" }), true);
		instance.entries[0].customType = " ";
		expect(instance.serialize()).toBe("");
	});

	it("leaves a cleared custom embed string out instead of emitting an empty string", () => {
		const instance = component(JSON.stringify(["a", "b"]), true);
		instance.entries[0].customType = "";
		expect(JSON.parse(instance.embedJson)).toEqual(["b"]);
	});

	it("switching back to raw shows the serialized JSON and emits it", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		instance.toggleMode();
		expect(instance.mode).toBe("raw");
		expect(instance.rawText).toBe(JSON.stringify({ title: "A" }, null, 2));
		expect(instance.embedJson).toBe(JSON.stringify({ title: "A" }, null, 2));
	});

	it("does not emit when the serialization did not change", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		instance.entries[0].title = "A";
		expect(instance.embedJson).toBe(JSON.stringify({ title: "A" }, null, 2));
	});

	it("never mutates the JSON that was handed in", () => {
		const source = {
			title: "A",
			fields: [{ name: "n", value: "v", inline: true }],
		};
		const instance = component(JSON.stringify(source));
		instance.entries[0].title = "B";
		instance.entries[0].fields[0].name = "m";
		expect(source).toEqual({
			title: "A",
			fields: [{ name: "n", value: "v", inline: true }],
		});
	});

	it("keeps the component usable after a failed parse by staying in raw mode", () => {
		const instance = component("{oops");
		expect(instance.mode).toBe("raw");
		expect(instance.parseError).toContain("Invalid JSON");
		instance.rawText = JSON.stringify({ title: "fixed" });
		instance.toggleMode();
		expect(instance.mode).toBe("editor");
		expect(instance.parseError).toBeNull();
		expect(instance.entries[0].title).toBe("fixed");
	});

	it("keeps the parse error after another invalid raw input", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		instance.toggleMode();
		instance.rawText = "{oops";
		instance.toggleMode();
		expect(instance.parseError).toContain("Invalid JSON");
		instance.rawText = "{still invalid";
		instance.onRawTextInput();
		expect(instance.parseError).toContain("Invalid JSON");
		instance.rawText = JSON.stringify({ title: "fixed" });
		instance.onRawTextInput();
		expect(instance.parseError).toBeNull();
	});

	it("reloads when the host passes new JSON", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		instance.embedJson = JSON.stringify({ title: "B" });
		instance.ngOnChanges({
			embedJson: new SimpleChange(
				JSON.stringify({ title: "A" }),
				instance.embedJson,
				false,
			),
		});
		expect(instance.mode).toBe("editor");
		expect(instance.entries[0].title).toBe("B");
	});

	it("ignores the host echoing back what the editor emitted", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		const entry = instance.entries[0];
		entry.title = "B";
		instance.ngOnChanges({
			embedJson: new SimpleChange(undefined, instance.embedJson, false),
		});
		expect(instance.entries[0]).toBe(entry);
	});

	it("stays in raw mode when the host passes new JSON while raw is open", () => {
		const instance = component(JSON.stringify({ title: "A" }));
		instance.toggleMode();
		instance.embedJson = JSON.stringify({ title: "B" });
		instance.ngOnChanges({
			embedJson: new SimpleChange(undefined, instance.embedJson, false),
		});
		expect(instance.mode).toBe("raw");
		expect(instance.rawText).toBe(JSON.stringify({ title: "B" }));
	});

	it("gives every instance its own parse error id", () => {
		expect(component().parseErrorId).not.toBe(component().parseErrorId);
	});
});
