import { describe, expect, it } from "vitest";
import { SseParser } from "./sse-parser";

describe("SseParser", () => {
	it("parses named events and skips comments", () => {
		const parser = new SseParser();

		const events = parser.feed(
			':heartbeat\n\nid:stream:1\nevent:StaticMessage\ndata:{"id":1}\n\n:heartbeat\n\n',
		);

		expect(events).toEqual([
			{ id: "stream:1", event: "StaticMessage", data: '{"id":1}' },
		]);
	});

	it("parses events that are split across chunks", () => {
		const parser = new SseParser();

		expect(parser.feed("event: Tick")).toEqual([]);
		expect(parser.feed('et\r\ndata: {"id"')).toEqual([]);
		expect(parser.feed(":2}\r")).toEqual([]);
		expect(parser.feed("\n\r\n")).toEqual([
			{ id: null, event: "Ticket", data: '{"id":2}' },
		]);
	});

	it("joins multiple data lines and defaults the event name", () => {
		const parser = new SseParser();

		expect(parser.feed("data: first\ndata: second\n\n")).toEqual([
			{ id: null, event: "message", data: "first\nsecond" },
		]);
	});
});
