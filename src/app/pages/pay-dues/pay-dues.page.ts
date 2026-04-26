import { Component } from '@angular/core';
import { MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Flat } from '../../services/society.service';

@Component({
  selector: 'app-pay-dues',
  templateUrl: 'pay-dues.page.html',
  styleUrls: ['pay-dues.page.scss'],
  standalone: false
})
export class PayDuesPage {
  /* Step 1 — flat selection */
  searchTerm = '';
  flats: Flat[] = [];
  selectedWing: 'ALL' | 'A' | 'B' = 'ALL';

  /* Step 2 — payment */
  selectedFlat: Flat | null = null;
  allMonths: string[] = [];
  checkedMonths: Record<string, boolean> = {};

  constructor(private society: SocietyService, private menu: MenuController, private toast: ToastController) {}

  ionViewWillEnter() {
    this.flats = this.society.getFlats();
    this.allMonths = this.society.getAllMonths();
    this.selectedFlat = null;
    this.searchTerm = '';
  }

  /* ── Step 1 helpers ── */
  get filteredFlats(): Flat[] {
    const term = this.searchTerm.toLowerCase();
    return this.flats.filter(f => {
      const matchWing = this.selectedWing === 'ALL' || f.wing === this.selectedWing;
      const matchSearch = !term || f.flatNo.toLowerCase().includes(term) || f.ownerName.toLowerCase().includes(term);
      return matchWing && matchSearch;
    });
  }

  getTotalDue(flat: Flat) { return this.society.getTotalDue(flat); }
  isPaidMonth(flatId: string, month: string) { return this.society.isPaid(flatId, month); }

  selectFlat(flat: Flat) {
    this.selectedFlat = flat;
    this.checkedMonths = {};
    // pre-check all unpaid months
    this.unpaidMonths.forEach(m => this.checkedMonths[m] = true);
  }

  back() { this.selectedFlat = null; }

  /* ── Step 2 helpers ── */
  get unpaidMonths(): string[] {
    if (!this.selectedFlat) return [];
    return this.allMonths.filter(m => !this.society.isPaid(this.selectedFlat!.id, m));
  }

  get paidMonths(): string[] {
    if (!this.selectedFlat) return [];
    return this.allMonths.filter(m => this.society.isPaid(this.selectedFlat!.id, m));
  }

  get selectedMonths(): string[] {
    return this.unpaidMonths.filter(m => this.checkedMonths[m]);
  }

  get selectedTotal(): number {
    return this.selectedMonths.length * (this.selectedFlat?.monthlyAmount || 0);
  }

  toggleAll(checked: boolean) {
    this.unpaidMonths.forEach(m => this.checkedMonths[m] = checked);
  }

  get allChecked(): boolean {
    return this.unpaidMonths.length > 0 && this.unpaidMonths.every(m => this.checkedMonths[m]);
  }

  async paySelected() {
    if (!this.selectedFlat || !this.selectedMonths.length) return;
    this.selectedMonths.forEach(month => {
      this.society.addPayment({
        flatId: this.selectedFlat!.id,
        month,
        amountPaid: this.selectedFlat!.monthlyAmount,
        paidDate: new Date().toISOString(),
        note: ''
      });
    });
    const t = await this.toast.create({
      message: `✅ ${this.selectedMonths.length} month(s) paid for ${this.selectedFlat.flatNo}`,
      duration: 2500, color: 'success', position: 'bottom'
    });
    t.present();
    // refresh
    this.selectFlat(this.selectedFlat);
  }

  getMonthLabel(m: string) { return this.society.getMonthLabel(m); }
  openMenu() { this.menu.open('main-menu'); }
}
