export interface ServerSentEvent {
	/** The id of the event, if it has one. */
	id: string | null;
	event: string;
	data: string;
}

/**
 * Incrementally parses a text/event-stream, as specified in
 * https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation.
 * Comments (e.g. heartbeats) and events without data are skipped, the retry field isn't used by the API.
 */
export class SseParser {
	private buffer = "";
	private eventName = "";
	private eventId: string | null = null;
	private dataLines: string[] = [];

	/**
	 * Feeds the next chunk of the stream and returns all events that were completed by it.
	 */
	feed(chunk: string): ServerSentEvent[] {
		this.buffer += chunk;
		const events: ServerSentEvent[] = [];

		let lineEnd = this.findLineEnd();
		while (lineEnd !== null) {
			const line = this.buffer.slice(0, lineEnd.index);
			this.buffer = this.buffer.slice(lineEnd.index + lineEnd.length);

			const event = this.processLine(line);
			if (event) {
				events.push(event);
			}

			lineEnd = this.findLineEnd();
		}

		return events;
	}

	private findLineEnd(): { index: number; length: number } | null {
		const index = this.buffer.search(/\r\n|\r|\n/);
		if (index === -1) {
			return null;
		}

		// a trailing \r might be the first half of \r\n, so wait for the next chunk
		if (this.buffer[index] === "\r" && index === this.buffer.length - 1) {
			return null;
		}

		return {
			index,
			length: this.buffer.startsWith("\r\n", index) ? 2 : 1,
		};
	}

	private processLine(line: string): ServerSentEvent | null {
		if (line === "") {
			return this.dispatch();
		}

		if (line.startsWith(":")) {
			return null;
		}

		const colon = line.indexOf(":");
		const field = colon === -1 ? line : line.slice(0, colon);
		let value = colon === -1 ? "" : line.slice(colon + 1);
		if (value.startsWith(" ")) {
			value = value.slice(1);
		}

		if (field === "event") {
			this.eventName = value;
		} else if (field === "id") {
			this.eventId = value;
		} else if (field === "data") {
			this.dataLines.push(value);
		}

		return null;
	}

	private dispatch(): ServerSentEvent | null {
		const event =
			this.dataLines.length > 0
				? {
						id: this.eventId,
						event: this.eventName || "message",
						data: this.dataLines.join("\n"),
					}
				: null;

		this.eventName = "";
		this.eventId = null;
		this.dataLines = [];
		return event;
	}
}
