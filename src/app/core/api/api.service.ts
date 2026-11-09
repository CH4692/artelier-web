import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { apiUrl } from './api-url';

/** Shared transport; feature services own their endpoint contracts. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(path: string) {
    return this.http.get<T>(apiUrl(this.baseUrl, path));
  }
  post<T>(path: string, body: unknown) {
    return this.http.post<T>(apiUrl(this.baseUrl, path), body);
  }
  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(apiUrl(this.baseUrl, path), body);
  }
  getBlob(path: string) {
    return this.http.get(apiUrl(this.baseUrl, path), {
      responseType: 'blob',
    });
  }
  getResponse<T>(path: string, params: Record<string, string | number | boolean>) {
    return this.http.get<T>(apiUrl(this.baseUrl, path), {
      params,
      observe: 'response',
    });
  }
}
