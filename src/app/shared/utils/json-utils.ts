/**
 * Parses JSON returned by the API.
 * Large integers are converted to strings before parsing, which prevents JavaScript precision loss for Discord
 * snowflake IDs (64-bit integers).
 */
export function parseApiJson(json: string): unknown {
	// This regex finds numbers that exceed JavaScript's safe integer range (> 2^53 - 1)
	// and wraps them in quotes so they're parsed as strings
	// Matches both object values (after :) and array values (after [ or a comma)
	const modifiedJson = json
		.replace(
			/:\s*(\d{16,})(?=\s*[,}\]])/g, // Match big numbers in objects (after colon)
			': "$1"',
		)
		.replace(
			/([[,])\s*(\d{16,})(?=\s*[,\]])/g, // Match big numbers in arrays (after [ or a comma)
			'$1"$2"',
		);

	return JSON.parse(modifiedJson);
}
