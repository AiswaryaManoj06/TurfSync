import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingRequest, BookingHistory, Slot } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  createBookingRequest(data: any): Observable<{ message: string; booking_reference: string; booking_id: number }> {
    return this.http.post<{ message: string; booking_reference: string; booking_id: number }>(
      `${this.apiUrl}/request/`,
      data
    );
  }

  getPlayerBookings(filters: Record<string, any> = {}): Observable<{ bookings: BookingRequest[] }> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val);
      }
    });
    return this.http.get<{ bookings: BookingRequest[] }>(`${this.apiUrl}/my-requests/`, { params });
  }

  getOwnerBookings(filters: Record<string, any> = {}): Observable<{ pending_count: number; requests: BookingRequest[] }> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val);
      }
    });
    return this.http.get<{ pending_count: number; requests: BookingRequest[] }>(`${this.apiUrl}/owner-requests/`, { params });
  }

  getBookingDetails(id: number): Observable<{ booking: BookingRequest; slots: Slot[]; timeline: BookingHistory[] }> {
    return this.http.get<{ booking: BookingRequest; slots: Slot[]; timeline: BookingHistory[] }>(`${this.apiUrl}/${id}/`);
  }

  approveBooking(id: number, data: { owner_note?: string; advance_payment_received?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/approve/`, data);
  }

  rejectBooking(id: number, data: { rejection_category: string; rejection_reason: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reject/`, data);
  }

  withdrawBooking(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/withdraw/`, {});
  }

  cancelBooking(id: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancel/`, { cancellation_reason: reason });
  }

  closeBooking(id: number, action: 'Completed' | 'No-Show'): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/close/`, { action });
  }

  bulkAction(data: { booking_ids: number[]; action: 'approve' | 'reject'; category?: string; reason?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk-action/`, data);
  }
}
