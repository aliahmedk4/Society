import { Component } from '@angular/core';
import { MenuController, ToastController } from '@ionic/angular';
import { SocietyService, MaintenanceCharge, FundConfig } from '../../services/society.service';

@Component({
  selector: 'app-config',
  templateUrl: 'config.page.html',
  styleUrls: ['config.page.scss'],
  standalone: false
})
export class ConfigPage {
  charges: MaintenanceCharge[] = [];
  allMonths: string[] = [];
  fund: FundConfig = { bankBalance: 0, lastUpdated: '' };
  bankBalanceInput: number | null = null;
  showBankForm = false;

  showForm = false;
  editingId: string | null = null;
  form = { label: '', amount: null as number | null, month: '', wingA: true, wingB: true, active: true };

  constructor(private society: SocietyService, private menu: MenuController, private toast: ToastController) {}

  ionViewWillEnter() {
    this.allMonths = this.society.getAllMonths();
    this.load();
    this.showForm = false;
    this.showBankForm = false;
  }

  load() {
    this.charges = this.society.getCharges();
    this.fund = this.society.getFundConfig();
  }

  saveBankBalance() {
    if (this.bankBalanceInput === null || this.bankBalanceInput < 0) { this.showToast('Enter a valid amount', 'warning'); return; }
    this.society.saveFundConfig({ bankBalance: +this.bankBalanceInput, lastUpdated: new Date().toISOString() });
    this.load();
    this.showBankForm = false;
    this.showToast('Bank balance updated', 'success');
  }

  getMonthLabel(m: string) { return this.society.getMonthLabel(m); }
  getChargeLabel(c: MaintenanceCharge) { return this.society.getChargeLabel(c); }

  wingLabel(c: MaintenanceCharge): string {
    if (c.wingA && c.wingB) return 'Both Wings';
    if (c.wingA) return 'Wing A';
    if (c.wingB) return 'Wing B';
    return 'None';
  }

  openAdd() {
    const now = new Date();
    this.form = {
      label: '', amount: null,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      wingA: true, wingB: true, active: true
    };
    this.editingId = null;
    this.showForm = true;
  }

  openEdit(c: MaintenanceCharge) {
    this.form = { label: c.label, amount: c.amount, month: c.month, wingA: c.wingA, wingB: c.wingB, active: c.active };
    this.editingId = c.id;
    this.showForm = true;
  }

  cancelForm() { this.showForm = false; this.editingId = null; }

  save() {
    if (!this.form.label.trim()) { this.showToast('Enter a label', 'warning'); return; }
    if (!this.form.amount || this.form.amount <= 0) { this.showToast('Enter a valid amount', 'warning'); return; }
    if (!this.form.month) { this.showToast('Select a month', 'warning'); return; }
    if (!this.form.wingA && !this.form.wingB) { this.showToast('Select at least one wing', 'warning'); return; }

    const data = {
      label: this.form.label.trim(),
      amount: +this.form.amount,
      month: this.form.month,
      wingA: this.form.wingA,
      wingB: this.form.wingB,
      active: this.form.active
    };

    if (this.editingId) {
      this.society.updateCharge({ ...data, id: this.editingId });
      this.showToast('Charge updated', 'success');
    } else {
      this.society.addCharge(data);
      this.showToast('Charge added', 'success');
    }
    this.load();
    this.showForm = false;
    this.editingId = null;
  }

  toggleActive(c: MaintenanceCharge) {
    this.society.updateCharge({ ...c, active: !c.active });
    this.load();
  }

  async deleteCharge(c: MaintenanceCharge) {
    this.society.deleteCharge(c.id);
    this.load();
    this.showToast('Charge deleted', 'danger');
  }

  async showToast(message: string, color: string) {
    const t = await this.toast.create({ message, duration: 2000, color, position: 'bottom' });
    t.present();
  }

  openMenu() { this.menu.open('main-menu'); }
}
