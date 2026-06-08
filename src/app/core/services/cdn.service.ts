import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CdnService {
  private http = inject(HttpClient);

  /**
   * Upload a file to the CDN
   * @param filename The filename (without extension) - optional
   * @param file The file to upload
   * @returns Observable with the CDN URL
   */
  uploadFile(filename: string, file: File): Observable<string> {
    // Build URL: {cdn_url}/{file_name} (filename is optional)
    let url = environment.cdnUrl;
    if (filename && filename.trim()) {
      url += filename.trim();
    }

    // Send raw file bytes as request body
    return this.http.post(url, file, {
      responseType: 'text'  // Response is plain text filename
    }).pipe(
      map(responseFilename => {
        // Return full CDN URL: {cdn_url}/{response_body}
        return environment.cdnUrl + responseFilename;
      })
    );
  }
}
