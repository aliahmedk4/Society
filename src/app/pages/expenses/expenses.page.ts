import { Component } from '@angular/core';
import { AlertController, MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Expense } from '../../services/society.service';

export const CATEGORIES = ['Maintenance', 'Cleaning', 'Security', 'Electricity', 'Water', 'Repairs', 'Garden', 'Other'];

@Component({
  selector: 'app-expenses',
  templateUrl: 'expenses.page.html',
  styleUrls: ['expenses.page.scss'],
  standalone: false
})
export class ExpensesPage {
  expenses: Expense[] = [];
  filterMonth = '';
  allMonths: string[] = [];
  categories = CATEGORIES;

  /* Add form */
  showForm = false;
  form = { title: '', amount: null as number | null, category: 'Maintenance', note: '' };

  constructor(
    private society: SocietyService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private menu: MenuController
  ) {}

  ionViewWillEnter() {
    const now = new Date();
    this.filterMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.allMonths = this.society.getAllMonths();
    this.load();
    this.showForm = false;
  }

  load() { this.expenses = this.society.getExpenses(); }

  get filtered(): Expense[] {
    if (!this.filterMonth) return this.expenses;
    return this.expenses.filter(e => e.date.startsWith(this.filterMonth));
  }

  get totalFiltered(): number { return this.filtered.reduce((s, e) => s + e.amount, 0); }

  getMonthLabel(m: string) { return this.society.getMonthLabel(m); }

  openForm() {
    this.form = { title: '', amount: null, category: 'Maintenance', note: '' };
    this.showForm = true;
  }

  cancelForm() { this.showForm = false; }

  saveExpense() {
    if (!this.form.title.trim() || !this.form.amount || this.form.amount <= 0) {
      this.showToast('Please enter title and a valid amount', 'warning');
      return;
    }
    this.society.addExpense({
      title: this.form.title.trim(),
      amount: +this.form.amount,
      category: this.form.category,
      date: this.filterMonth,
      note: this.form.note.trim()
    });
    this.load();
    this.showForm = false;
    this.showToast('Expense added', 'success');
  }

  async deleteExpense(e: Expense) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Expense',
      message: `Delete "${e.title}" (₹${e.amount.toLocaleString('en-IN')})?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => { this.society.deleteExpense(e.id); this.load(); this.showToast('Deleted', 'danger'); } }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    t.present();
  }

  openMenu() { this.menu.open('main-menu'); }

  getCatIcon(cat: string): string {
    const map: Record<string, string> = {
      'Maintenance': '🔧', 'Cleaning': '🧹', 'Security': '🔒',
      'Electricity': '⚡', 'Water': '💧', 'Repairs': '🛠️',
      'Garden': '🌿', 'Other': '📦'
    };
    return map[cat] || '📦';
  }
}
