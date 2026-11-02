import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Slot } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class SlotService {
  private apiUrl = `${environment.apiUrl}/slots`;

  constructor(private http: HttpClient) {}

  getSlots(turfId: number, date?: string, statusFilter?: string): Observable<{ slots: Slot[] }> {
    let params = new HttpParams().set('turf_id', turfId.toString());
    if (date) params = params.set('date', date);
    if (statusFilter && statusFilter !== 'All') params = params.set('status', statusFilter);

    return this.http.get<{ slots: Slot[] }>(`${this.apiUrl}/`, { params });
  }

  createSlots(slotData: any): Observable<{ message: string; created_count: number; skipped_overlaps: number }> {
    return this.http.post<{ message: string; created_count: number; skipped_overlaps: number }>(
      `${this.apiUrl}/create/`,
      slotData
    );
  }

  blockSlot(slotId: number, blockReason: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/block/`, {
      slot_id: slotId,
      block_reason: blockReason
    });
  }

  unblockSlot(slotId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${slotId}/unblock/`, {});
  }

  deleteSlot(slotId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${slotId}/delete/`);
  }
}
