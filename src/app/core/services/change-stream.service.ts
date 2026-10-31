import { Injectable, inject } from "@angular/core";
import {
	filter,
	firstValueFrom,
	fromEvent,
	Observable,
	share,
	takeUntil,
} from "rxjs";
import { environment } from "../../../environments/environment";
import { parseApiJson } from "../../shared/utils/json-utils";
import {
	CHANGE_EVENT_TYPES,
	type ChangeEvent,
	type ChangeEventType,
	type ChangeStreamEvent,
} from "../models/change-event";
import { AuthService } from "./auth.service";
import { type ServerSentEvent, SseParser } from "./sse-parser";

const MIN_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 60_000;

/**
 * Connects to the change stream of the API, which pushes changes of entities the logged-in user is allowed to see.
 *
 * The browser's EventSource can't send the access token, so the stream is read with fetch instead.
 * A single connection is shared by all subscribers: it is opened with the first subscriber, closed after the last
 * one unsubscribed, and re-established automatically, e.g. after the access token expired.
 */
@Injectable({
	providedIn: "root",
})
export class ChangeStreamService {
	private authService = inject(AuthService);

	private readonly events$ = new Observable<ChangeStreamEvent>((subscriber) => {
		const abortController = new AbortController();
		void this.listen(abortController.signal, (event) => subscriber.next(event));
		return () => abortController.abort();
	}).pipe(share());

	/**
	 * Emits every change of the given types, and a connected event whenever the stream was (re)connected.
	 * Changes that happened while the stream was disconnected aren't replayed, so reload the shown data on connect.
	 */
	events(types: ChangeEventType[]): Observable<ChangeStreamEvent> {
		return this.events$.pipe(
			filter(
				(event) =>
					event.kind === "connected" || types.includes(event.change.type),
			),
		);
	}

	private async listen(
		signal: AbortSignal,
		emit: (event: ChangeStreamEvent) => void,
	): Promise<void> {
		let reconnectDelay = MIN_RECONNECT_DELAY_MS;

		while (!signal.aborted) {
			try {
				await this.waitForAuthentication(signal);
				await this.connect(signal, emit, () => {
					reconnectDelay = MIN_RECONNECT_DELAY_MS;
				});
			} catch (error) {
				if (signal.aborted) {
					return;
				}

				if (!environment.production) {
					console.warn("[Change Stream] Connection failed:", error);
				}
			}

			await this.delay(reconnectDelay, signal);
			reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
		}
	}

	private async connect(
		signal: AbortSignal,
		emit: (event: ChangeStreamEvent) => void,
		onConnected: () => void,
	): Promise<void> {
		const response = await fetch(`${environment.apiUrl}/api/v1/changes`, {
			headers: {
				Authorization: `Bearer ${this.authService.getAccessToken()}`,
				Accept: "text/event-stream",
			},
			cache: "no-store",
			signal,
		});

		if (!response.ok || !response.body) {
			throw new Error(`The change stream responded with ${response.status}.`);
		}

		onConnected();
		emit({ kind: "connected" });

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		const parser = new SseParser();

		for (;;) {
			const { value, done } = await reader.read();
			if (done) {
				// the server closes the stream once the access token expires
				return;
			}

			for (const event of parser.feed(
				decoder.decode(value, { stream: true }),
			)) {
				const change = this.parseChange(event);
				if (change) {
					emit({ kind: "change", change });
				}
			}
		}
	}

	private parseChange(event: ServerSentEvent): ChangeEvent | null {
		// events of types this dashboard doesn't know yet are ignored, so new types don't break it
		if (!CHANGE_EVENT_TYPES.includes(event.event as ChangeEventType)) {
			return null;
		}

		try {
			return parseApiJson(event.data) as ChangeEvent;
		} catch (error) {
			console.error("[Change Stream] Couldn't parse change:", event, error);
			return null;
		}
	}

	private async waitForAuthentication(signal: AbortSignal): Promise<void> {
		await firstValueFrom(
			this.authService.isAuthenticated$.pipe(
				filter(() => this.authService.isAuthenticated()),
				takeUntil(fromEvent(signal, "abort")),
			),
		);
	}

	private delay(milliseconds: number, signal: AbortSignal): Promise<void> {
		return new Promise((resolve) => {
			const timeout = setTimeout(resolve, milliseconds);
			signal.addEventListener(
				"abort",
				() => {
					clearTimeout(timeout);
					resolve();
				},
				{ once: true },
			);
		});
	}
}
