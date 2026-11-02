import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationItem } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<{ notifications: NotificationItem[]; unread_count: number }> {
    return this.http.get<{ notifications: NotificationItem[]; unread_count: number }>(`${this.apiUrl}/`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/read/`, {});
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(`${this.apiUrl}/mark-all-read/`, {});
  }
}
