import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-layout',
  templateUrl: 'layout.page.html',
  styleUrls: ['layout.page.scss'],
  standalone: false
})
export class LayoutPage implements OnInit {
  active = 'dashboard';

  constructor(private router: Router, private menu: MenuController) {}

  ngOnInit() {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        const seg = e.urlAfterRedirects.split('/').filter(Boolean);
        this.active = seg[seg.length - 1] || 'dashboard';
      }
    });
  }

  async go(page: string) {
    await this.menu.close('main-menu');
    this.router.navigate(['/app', page]);
  }
}
