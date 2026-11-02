import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  title = 'TurfSync';

  constructor(
    public auth: AuthService,
    private router: Router
  ) {}

  get showSidebar(): boolean {
    if (!this.auth.isLoggedIn) return false;
    const url = this.router.url;
    // Sidebar should ONLY appear inside Admin or Turf Owner portals
    if (this.auth.isAdmin && url.startsWith('/admin')) return true;
    if (this.auth.isOwner && url.startsWith('/owner')) return true;
    return false;
  }
}
