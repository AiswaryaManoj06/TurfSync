import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Turf } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class TurfService {
  private apiUrl = `${environment.apiUrl}/turfs`;

  constructor(private http: HttpClient) {}

  getTurfs(filters: Record<string, any> = {}): Observable<{ turfs: Turf[] }> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val);
      }
    });
    return this.http.get<{ turfs: Turf[] }>(`${this.apiUrl}/`, { params });
  }

  getTurfById(turfId: number): Observable<{ turf: Turf }> {
    return this.http.get<{ turf: Turf }>(`${this.apiUrl}/${turfId}/`);
  }

  createTurf(turfData: Partial<Turf>): Observable<{ message: string; turf_id: number }> {
    return this.http.post<{ message: string; turf_id: number }>(`${this.apiUrl}/`, turfData);
  }

  updateTurf(turfId: number, turfData: Partial<Turf>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${turfId}/`, turfData);
  }

  deleteTurf(turfId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${turfId}/`);
  }
}
