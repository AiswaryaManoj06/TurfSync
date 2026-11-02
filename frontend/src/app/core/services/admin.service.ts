import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Owner, AuditLog } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/`);
  }

  getOwners(filters: Record<string, any> = {}): Observable<{ owners: Owner[] }> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      const val = filters[key];
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val);
      }
    });
    return this.http.get<{ owners: Owner[] }>(`${this.apiUrl}/owners/`, { params });
  }

  getOwnerDetail(ownerId: number): Observable<{ owner: Owner; audit_logs: AuditLog[] }> {
    return this.http.get<{ owner: Owner; audit_logs: AuditLog[] }>(`${this.apiUrl}/owners/${ownerId}/`);
  }

  verifyOwner(
    ownerId: number,
    data: {
      verification_id_proof: boolean;
      verification_ownership_proof: boolean;
      verification_bank_details: boolean;
      admin_note?: string;
    }
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/owners/${ownerId}/verify/`, data);
  }

  rejectOwner(ownerId: number, data: { rejection_category: string; rejection_reason: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/owners/${ownerId}/reject/`, data);
  }

  toggleSuspend(ownerId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/owners/${ownerId}/toggle-status/`, { reason });
  }

  bulkAction(data: { owner_ids: number[]; action: 'approve' | 'reject'; rejection_category?: string; reason?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/owners/bulk-action/`, data);
  }

  getAuditLogs(): Observable<{ audit_logs: AuditLog[] }> {
    return this.http.get<{ audit_logs: AuditLog[] }>(`${this.apiUrl}/audit-logs/`);
  }
}
