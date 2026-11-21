import { TestBed } from "@angular/core/testing";
import { BehaviorSubject, firstValueFrom, take, toArray } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangeStreamEvent } from "../models/change-event";
import { AuthService } from "./auth.service";
import { ChangeStreamService } from "./change-stream.service";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});
}

describe("ChangeStreamService", () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn(
			async (_url: string, init: RequestInit) =>
				new Response(
					streamOf(
						`event:Connected\ndata:{"resumed":${"Last-Event-ID" in (init.headers as Record<string, string>)}}\n\n`,
						":heartbeat\n\n",
						'id:stream:1\nevent:StaticMessage\ndata:{"type":"StaticMessage","action":"Updated","serverId":693263712626278553,"data":{"id":3}}\n\n',
						'id:stream:2\nevent:CarryQueue\ndata:{"type":"CarryQueue","action":"Created","serverId":1,"data":{"id":4}}\n\n',
						"id:stream:3\nevent:SomeFutureType\ndata:{}\n\n",
					),
					{ status: 200, headers: { "Content-Type": "text/event-stream" } },
				),
		);
		vi.stubGlobal("fetch", fetchMock);

		TestBed.configureTestingModule({
			providers: [
				{
					provide: AuthService,
					useValue: {
						isAuthenticated$: new BehaviorSubject(true),
						isAuthenticated: () => true,
						getAccessToken: () => "token",
					},
				},
			],
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("emits the changes of the requested types and resumes after the stream ended", async () => {
		const service = TestBed.inject(ChangeStreamService);

		const events: ChangeStreamEvent[] = await firstValueFrom(
			service.events(["StaticMessage"]).pipe(take(3), toArray()),
		);

		expect(events[0]).toEqual({ kind: "connected", resumed: false });
		expect(events[1]).toEqual({
			kind: "change",
			change: {
				type: "StaticMessage",
				action: "Updated",
				serverId: "693263712626278553",
				data: { id: 3 },
			},
		});
		// the stream ended, so it was opened again with the id of the last received event
		expect(events[2]).toEqual({ kind: "connected", resumed: true });
		expect(fetchMock.mock.calls[1][1].headers["Last-Event-ID"]).toBe(
			"stream:3",
		);

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("http://localhost:8080/api/v1/changes");
		expect(init.headers).toEqual({
			Authorization: "Bearer token",
			Accept: "text/event-stream",
		});
	});
});
