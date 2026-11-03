import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LocationsResponse, City } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'turfsync_token';
  private readonly USER_KEY = 'turfsync_user';
  private apiUrl = `${environment.apiUrl}/auth`;

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public get isLoggedIn(): boolean {
    return !!this.token && !!this.currentUserValue;
  }

  public get role(): string | null {
    return this.currentUserValue?.role || null;
  }

  public get isAdmin(): boolean {
    return this.currentUserValue?.role === 'admin';
  }

  public get isOwner(): boolean {
    return this.currentUserValue?.role === 'owner';
  }

  public get isApprovedOwner(): boolean {
    return this.isOwner && this.currentUserValue?.account_status === 'Approved';
  }

  public get isPlayer(): boolean {
    return this.currentUserValue?.role === 'player';
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login/`, credentials).pipe(
      tap((response) => {
        if (response.token && response.user) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  registerOwner(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/owner/`, formData);
  }

  checkUnique(data: { type: string; [key: string]: any }): Observable<{ available: boolean; field?: string; fields?: string[]; error?: string }> {
    return this.http.post<{ available: boolean; field?: string; fields?: string[]; error?: string }>(`${this.apiUrl}/check-unique/`, data);
  }

  registerPlayer(formData: FormData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/player/`, formData).pipe(
      tap((response) => {
        if (response.token && response.user) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  getLocations(): Observable<LocationsResponse> {
    return this.http.get<LocationsResponse>(`${this.apiUrl}/locations/`);
  }

  getExternalCities(stateId?: number, stateName?: string): Observable<{ cities: City[]; count: number; source: string }> {
    let params = '';
    if (stateId) {
      params = `?state_id=${stateId}`;
    } else if (stateName) {
      params = `?state=${encodeURIComponent(stateName)}`;
    }
    return this.http.get<{ cities: City[]; count: number; source: string }>(`${this.apiUrl}/external-cities/${params}`);
  }

  fetchProfile(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.apiUrl}/me/`).pipe(
      tap((res) => {
        if (res && res.user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
