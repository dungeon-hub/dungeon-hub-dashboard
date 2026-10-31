import { describe, expect, it } from "vitest";
import { parseApiJson } from "./json-utils";

describe("parseApiJson", () => {
	it("keeps discord snowflakes as strings", () => {
		expect(
			parseApiJson(
				'{"id":5,"serverId":693263712626278553,"objectIds":[1273562347797090377,7]}',
			),
		).toEqual({
			id: 5,
			serverId: "693263712626278553",
			objectIds: ["1273562347797090377", 7],
		});
	});
});
