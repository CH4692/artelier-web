import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';

/** Shared transport; feature services own their endpoint contracts. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get<T>(path: string) {
    return this.http.get<T>(`${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`);
  }
  post<T>(path: string, body: unknown) {
    return this.http.post<T>(
      `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`,
      body,
    );
  }
  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(
      `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`,
      body,
    );
  }
  getBlob(path: string) {
    return this.http.get(`${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`, {
      responseType: 'blob',
    });
  }
  getResponse<T>(path: string, params: Record<string, string | number | boolean>) {
    return this.http.get<T>(`${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`, {
      params,
      observe: 'response',
    });
  }
}
