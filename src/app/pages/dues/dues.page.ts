import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Flat, MaintenanceCharge } from '../../services/society.service';

export interface DueItem {
  key: string;
  label: string;
  amount: number;
  isCharge: boolean;
  selected: boolean;
  partialAmount: number;
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

  payingDue: FlatDue | null = null;
  payAmount: number | null = null;
  payDate: string = '';
  payNote: string = '';

  constructor(
    private society: SocietyService,
    private router: Router,
    private menu: MenuController,
    private toast: ToastController
  ) {}

  ionViewWillEnter() { this.loadDues(); }

  loadDues() {
    const flats = this.society.getFlats();
    const allMonths = this.society.getAllMonths();
    const allCharges = this.society.getCharges().filter(c => c.active);

    this.flatDues = flats.map(flat => {
      const items: DueItem[] = [];
      allMonths
        .filter(m => !this.society.isPaid(flat.id, m))
        .forEach(m => items.push({ key: m, label: this.society.getMonthLabel(m), amount: flat.monthlyAmount, isCharge: false, selected: true, partialAmount: flat.monthlyAmount }));
      allCharges
        .filter(c => flat.wing === 'A' ? c.wingA : c.wingB)
        .filter(c => !this.society.isPaid(flat.id, `charge:${c.id}`))
        .forEach(c => items.push({ key: `charge:${c.id}`, label: this.society.getChargeLabel(c), amount: c.amount, isCharge: true, selected: true, partialAmount: c.amount }));
      return { flat, items, totalDue: this.society.getTotalDue(flat) };
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

  openPaySheet(fd: FlatDue) {
    this.payingDue = fd;
    fd.items.forEach(i => { i.selected = true; i.partialAmount = i.amount; });
    this.payAmount = fd.items.reduce((s, i) => s + i.amount, 0);
    const now = new Date();
    this.payDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.payNote = '';
  }

  closePaySheet() { this.payingDue = null; }

  get selectedItems(): DueItem[] { return this.payingDue?.items.filter(i => i.selected) || []; }
  get selectedTotal(): number { return this.selectedItems.reduce((s, i) => s + i.partialAmount, 0); }

  onAmountChange() {
    if (!this.payingDue || this.payAmount == null) return;
    let remaining = +this.payAmount;
    this.payingDue.items.forEach(i => {
      if (remaining <= 0) { i.selected = false; i.partialAmount = 0; }
      else if (remaining >= i.amount) { i.selected = true; i.partialAmount = i.amount; remaining -= i.amount; }
      else { i.selected = true; i.partialAmount = remaining; remaining = 0; }
    });
  }

  toggleItem(item: DueItem) {
    item.selected = !item.selected;
    if (!item.selected) item.partialAmount = 0;
    else item.partialAmount = item.amount;
    this.payAmount = this.selectedTotal;
  }

  confirmPayment() {
    if (!this.payingDue || !this.selectedItems.length) return;
    const paidDate = this.payDate ? new Date(this.payDate).toISOString() : new Date().toISOString();
    this.selectedItems.forEach(item => {
      this.society.addPayment({
        flatId: this.payingDue!.flat.id,
        month: item.key,
        amountPaid: item.partialAmount,
        paidDate,
        note: this.payNote || (item.isCharge ? item.label : 'Due payment')
      });
    });
    this.showToast(`✅ Payment recorded for ${this.payingDue.flat.flatNo}`, 'success');
    this.payingDue = null;
    this.loadDues();
  }

  openMenu() { this.menu.open('main-menu'); }
  go(page: string) { this.router.navigate(['/app', page]); }

  async showToast(message: string, color: string) {
    const t = await this.toast.create({ message, duration: 2500, color, position: 'bottom' });
    t.present();
  }
}
