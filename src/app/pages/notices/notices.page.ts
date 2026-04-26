import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Notice } from '../../services/society.service';

@Component({
  selector: 'app-notices',
  templateUrl: 'notices.page.html',
  styleUrls: ['notices.page.scss'],
  standalone: false
})
export class NoticesPage {
  notices: Notice[] = [];

  constructor(private society: SocietyService, private alertCtrl: AlertController, private toastCtrl: ToastController, private router: Router, private menu: MenuController) {}

  ionViewWillEnter() { this.notices = this.society.getNotices(); }

  async addNotice() {
    const alert = await this.alertCtrl.create({
      header: 'New Notice',
      inputs: [
        { name: 'title', type: 'text', placeholder: 'Notice Title' },
        { name: 'body', type: 'textarea', placeholder: 'Notice details...' },
        { name: 'priority', type: 'radio', label: '📢 Normal', value: 'normal', checked: true },
        { name: 'priority', type: 'radio', label: '🚨 Urgent', value: 'urgent' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Post Notice', handler: (data): boolean => {
          if (!data.title?.trim()) return false;
          this.society.addNotice({ title: data.title.trim(), body: data.body || '', priority: data.priority || 'normal' });
          this.notices = this.society.getNotices(); this.showToast('Notice posted!', 'success'); return true;
        }}
      ]
    });
    await alert.present();
  }

  async deleteNotice(n: Notice) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Notice', message: `Delete "${n.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => { this.society.deleteNotice(n.id); this.notices = this.society.getNotices(); this.showToast('Notice deleted', 'danger'); } }
      ]
    });
    await alert.present();
  }

  openMenu() { this.menu.open('main-menu'); }
  go(page: string) { this.router.navigate(['/app', page]); }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, color });
    t.present();
  }
}
