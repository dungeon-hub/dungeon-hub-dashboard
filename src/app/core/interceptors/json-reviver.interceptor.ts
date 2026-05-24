import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * HTTP interceptor that converts large integers to strings in raw JSON before parsing.
 * This prevents JavaScript precision loss for Discord snowflake IDs (64-bit integers).
 *
 * Works by modifying the raw JSON text to wrap large integers in quotes before JSON.parse.
 */
export const jsonReviverInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept requests to our API
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // Request as text to get raw JSON string before parsing
  const textReq = req.clone({
    responseType: 'text'
  });

  return next(textReq).pipe(
    map(event => {
      if (event instanceof HttpResponse) {
        // Check if this is a JSON response
        const contentType = event.headers.get('content-type') || '';

        if (contentType.includes('application/json') && event.body) {
          // Only process if body is actually a string (not already parsed)
          if (typeof event.body === 'string') {
            try {
              // Convert large integers to strings in the raw JSON text before parsing
              // This regex finds numbers that exceed JavaScript's safe integer range (> 2^53 - 1)
              // and wraps them in quotes so they're parsed as strings
              // Matches both object values (after :) and array values (after [ or ,)
              let modifiedJson = event.body
                .replace(
                  /:\s*(\d{16,})(?=\s*[,\}\]])/g,  // Match big numbers in objects (after colon)
                  ': "$1"'
                )
                .replace(
                  /(\[|,)\s*(\d{16,})(?=\s*[,\]])/g,  // Match big numbers in arrays (after [ or ,)
                  '$1"$2"'
                );

              // Now parse the modified JSON
              const parsedBody = JSON.parse(modifiedJson);

              // Return new response with parsed body and correct type
              return event.clone({
                body: parsedBody
              });
            } catch (e) {
              console.error('Failed to parse JSON with custom reviver:', e, 'Body:', event.body);
              // If parsing fails, return original response
              return event;
            }
          } else {
            // Body is already parsed (shouldn't happen with responseType: 'text', but just in case)
            return event;
          }
        }
      }
      return event;
    })
  );
};
