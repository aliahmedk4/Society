import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Flat, MaintenanceCharge } from '../../services/society.service';

export interface DueItem {
  key: string;        // month string OR 'charge:id'
  label: string;
  amount: number;
  isCharge: boolean;
}

export interface FlatDue {
  flat: Flat;
  items: DueItem[];
  totalDue: number;
}

@Component({
  selector: 'app-dues',
  templateUrl: 'dues.page.html',
  styleUrls: ['dues.page.scss'],
  standalone: false
})
export class DuesPage {
  flatDues: FlatDue[] = [];
  filterWing: 'ALL' | 'A' | 'B' = 'ALL';
  searchTerm = '';
  totalOutstanding = 0;

  constructor(private society: SocietyService, private router: Router, private menu: MenuController, private alertCtrl: AlertController, private toastCtrl: ToastController) {}

  ionViewWillEnter() { this.loadDues(); }

  loadDues() {
    const flats = this.society.getFlats();
    const allMonths = this.society.getAllMonths();
    const allCharges = this.society.getCharges().filter(c => c.active);

    this.flatDues = flats.map(flat => {
      const items: DueItem[] = [];

      // Standard unpaid months
      allMonths
        .filter(m => !this.society.isPaid(flat.id, m))
        .forEach(m => items.push({
          key: m,
          label: this.society.getMonthLabel(m),
          amount: flat.monthlyAmount,
          isCharge: false
        }));

      // Unpaid maintenance charges for this wing
      allCharges
        .filter(c => flat.wing === 'A' ? c.wingA : c.wingB)
        .filter(c => !this.society.isPaid(flat.id, `charge:${c.id}`))
        .forEach(c => items.push({
          key: `charge:${c.id}`,
          label: this.society.getChargeLabel(c),
          amount: c.amount,
          isCharge: true
        }));

      const totalDue = this.society.getTotalDue(flat);
      return { flat, items, totalDue };
    }).filter(fd => fd.totalDue > 0).sort((a, b) => b.totalDue - a.totalDue);

    this.totalOutstanding = this.flatDues.reduce((s, fd) => s + fd.totalDue, 0);
  }

  get filtered(): FlatDue[] {
    const term = this.searchTerm.toLowerCase().trim();
    return this.flatDues.filter(fd => {
      const matchWing = this.filterWing === 'ALL' || fd.flat.wing === this.filterWing;
      const matchSearch = !term ||
        fd.flat.flatNo.toLowerCase().includes(term) ||
        fd.flat.ownerName.toLowerCase().includes(term) ||
        fd.flat.phone.toLowerCase().includes(term);
      return matchWing && matchSearch;
    });
  }

  async payDue(fd: FlatDue) {
    const alert = await this.alertCtrl.create({
      header: `Pay Dues — ${fd.flat.flatNo}`,
      subHeader: `${fd.flat.ownerName || 'No owner'} · Total Due: ₹${fd.totalDue.toLocaleString('en-IN')}`,
      inputs: fd.items.map(item => ({
        name: 'items', type: 'checkbox' as const,
        label: `${item.label} — ₹${item.amount.toLocaleString('en-IN')}`,
        value: item.key, checked: true
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Pay Selected', handler: (selectedKeys: string[]) => {
          if (!selectedKeys?.length) return false;
          selectedKeys.forEach(key => {
            const item = fd.items.find(i => i.key === key)!;
            this.society.addPayment({
              flatId: fd.flat.id, month: key,
              amountPaid: item.amount,
              paidDate: new Date().toISOString(),
              note: item.isCharge ? item.label : 'Past due payment'
            });
          });
          this.showToast(`✅ ${selectedKeys.length} item(s) paid for ${fd.flat.flatNo}`, 'success');
          this.loadDues(); return true;
        }}
      ]
    });
    await alert.present();
  }

  getMonthLabel(m: string) { return this.society.getMonthLabel(m); }
  openMenu() { this.menu.open('main-menu'); }
  go(page: string) { this.router.navigate(['/app', page]); }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    t.present();
  }
}
