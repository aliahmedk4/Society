import { Injectable } from '@angular/core';

export interface SocietyDetail {
  name: string; address: string; city: string; registrationNo: string;
  totalFlats: number; totalWings: number; floorsPerWing: number; flatsPerFloor: number;
  chairperson: string; secretary: string; treasurer: string;
  phone: string; email: string; established: string; amenities: string[];
}

export interface Flat {
  id: string; wing: 'A' | 'B'; floor: number; flatNo: string;
  ownerName: string; phone: string; type: '1BHK' | '2BHK';
  monthlyAmount: number; openingBalance: number;
}

export interface Payment {
  id: string; flatId: string; month: string; amountPaid: number;
  paidDate: string; receiptNo: string; note: string;
}

export interface Notice {
  id: string; title: string; body: string; date: string; priority: 'normal' | 'urgent';
}

export interface Vehicle {
  id: string; flatId: string; flatNo: string; ownerName: string;
  type: 'car' | 'bike'; vehicleNo: string; model: string;
}

export interface Expense {
  id: string; title: string; amount: number; category: string; date: string; note: string;
}

export interface MaintenanceCharge {
  id: string;
  label: string;
  amount: number;
  wingA: boolean;
  wingB: boolean;
  month: string;
  active: boolean;
}

export interface FundConfig {
  bankBalance: number;   // manually entered opening/current bank balance
  lastUpdated: string;   // ISO date when bank balance was last updated
}

const DETAIL_KEY   = 'sm_society_detail';
const FLATS_KEY    = 'sm_flats';
const PAYMENTS_KEY = 'sm_payments';
const NOTICES_KEY  = 'sm_notices';
const VEHICLES_KEY = 'sm_vehicles';
const EXPENSES_KEY = 'sm_expenses';
const CHARGES_KEY  = 'sm_charges';
const FUND_KEY     = 'sm_fund';
const START_MONTH  = '2026-01';

const DEFAULT_DETAIL: SocietyDetail = {
  name: 'Shree Ganesh Society', address: 'Plot No. 42, Sector 7',
  city: 'Pune, Maharashtra - 411001', registrationNo: 'MH/PUN/HSG/2010/1234',
  totalFlats: 56, totalWings: 2, floorsPerWing: 7, flatsPerFloor: 4,
  chairperson: 'Rajesh Sharma', secretary: 'Priya Mehta', treasurer: 'Anil Patil',
  phone: '+91 98765 43210', email: 'admin@shreeganeshsociety.in',
  established: '2010', amenities: ['Parking', 'Garden', 'CCTV', 'Lift', 'Water Tank', 'Generator']
};

@Injectable({ providedIn: 'root' })
export class SocietyService {

  /* ── Society Detail ── */
  getDetail(): SocietyDetail {
    const d = localStorage.getItem(DETAIL_KEY);
    return d ? JSON.parse(d) : DEFAULT_DETAIL;
  }
  saveDetail(detail: SocietyDetail) { localStorage.setItem(DETAIL_KEY, JSON.stringify(detail)); }

  /* ── Flats ── */
  getFlats(): Flat[] {
    const d = localStorage.getItem(FLATS_KEY);
    return d ? JSON.parse(d) : this.initFlats();
  }
  saveFlats(flats: Flat[]) { localStorage.setItem(FLATS_KEY, JSON.stringify(flats)); }

  /* ── Payments ── */
  getPayments(): Payment[] {
    const d = localStorage.getItem(PAYMENTS_KEY);
    return d ? JSON.parse(d) : [];
  }
  savePayments(p: Payment[]) { localStorage.setItem(PAYMENTS_KEY, JSON.stringify(p)); }

  addPayment(payment: Omit<Payment, 'id' | 'receiptNo'>): Payment {
    const payments = this.getPayments();
    const p: Payment = { ...payment, id: Date.now().toString(), receiptNo: 'RCP' + Date.now() };
    payments.push(p);
    this.savePayments(payments);
    return p;
  }
  getPaymentsForFlat(flatId: string) { return this.getPayments().filter(p => p.flatId === flatId); }
  getPaymentsForMonth(month: string) { return this.getPayments().filter(p => p.month === month); }
  isPaid(flatId: string, month: string) { return this.getPayments().some(p => p.flatId === flatId && p.month === month); }

  getTotalDue(flat: Flat): number {
    const start = new Date(START_MONTH + '-01');
    const now   = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
    const expected = flat.openingBalance + months * flat.monthlyAmount;
    const paid = this.getPaymentsForFlat(flat.id).reduce((s, p) => s + p.amountPaid, 0);
    const standardDue = Math.max(0, expected - paid);

    // Add unpaid maintenance charges for this flat's wing
    const chargeDue = this.getCharges()
      .filter(c => c.active && (flat.wing === 'A' ? c.wingA : c.wingB))
      .filter(c => !this.isPaid(flat.id, `charge:${c.id}`))
      .reduce((s, c) => s + c.amount, 0);

    return standardDue + chargeDue;
  }

  /* ── Notices ── */
  getNotices(): Notice[] {
    const d = localStorage.getItem(NOTICES_KEY);
    return d ? JSON.parse(d) : [];
  }
  saveNotices(n: Notice[]) { localStorage.setItem(NOTICES_KEY, JSON.stringify(n)); }

  addNotice(notice: Omit<Notice, 'id' | 'date'>): Notice {
    const notices = this.getNotices();
    const n: Notice = { ...notice, id: Date.now().toString(), date: new Date().toISOString() };
    notices.unshift(n);
    this.saveNotices(notices);
    return n;
  }
  deleteNotice(id: string) { this.saveNotices(this.getNotices().filter(n => n.id !== id)); }

  /* ── Vehicles ── */
  getVehicles(): Vehicle[] {
    const d = localStorage.getItem(VEHICLES_KEY);
    return d ? JSON.parse(d) : [];
  }
  saveVehicles(v: Vehicle[]) { localStorage.setItem(VEHICLES_KEY, JSON.stringify(v)); }

  addVehicle(v: Omit<Vehicle, 'id'>): Vehicle {
    const vehicles = this.getVehicles();
    const nv: Vehicle = { ...v, id: Date.now().toString() };
    vehicles.push(nv);
    this.saveVehicles(vehicles);
    return nv;
  }
  deleteVehicle(id: string) { this.saveVehicles(this.getVehicles().filter(v => v.id !== id)); }
  updateVehicle(v: Vehicle) {
    const vehicles = this.getVehicles();
    const idx = vehicles.findIndex(x => x.id === v.id);
    if (idx > -1) { vehicles[idx] = v; this.saveVehicles(vehicles); }
  }

  /* ── Expenses ── */
  getExpenses(): Expense[] {
    const d = localStorage.getItem(EXPENSES_KEY);
    return d ? JSON.parse(d) : [];
  }
  saveExpenses(e: Expense[]) { localStorage.setItem(EXPENSES_KEY, JSON.stringify(e)); }

  addExpense(expense: Omit<Expense, 'id'>): Expense {
    const expenses = this.getExpenses();
    const e: Expense = { ...expense, id: Date.now().toString() };
    expenses.unshift(e);
    this.saveExpenses(expenses);
    return e;
  }
  deleteExpense(id: string) { this.saveExpenses(this.getExpenses().filter(e => e.id !== id)); }

  getTotalExpenses(): number { return this.getExpenses().reduce((s, e) => s + e.amount, 0); }

  getMonthExpenses(month: string): number {
    return this.getExpenses().filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
  }

  /* ── Maintenance Charges ── */
  getCharges(): MaintenanceCharge[] {
    const d = localStorage.getItem(CHARGES_KEY);
    return d ? JSON.parse(d) : [];
  }
  saveCharges(c: MaintenanceCharge[]) { localStorage.setItem(CHARGES_KEY, JSON.stringify(c)); }

  addCharge(c: Omit<MaintenanceCharge, 'id'>): MaintenanceCharge {
    const charges = this.getCharges();
    const nc: MaintenanceCharge = { ...c, id: Date.now().toString() };
    charges.push(nc);
    this.saveCharges(charges);
    return nc;
  }
  updateCharge(c: MaintenanceCharge) {
    const charges = this.getCharges();
    const idx = charges.findIndex(x => x.id === c.id);
    if (idx > -1) { charges[idx] = c; this.saveCharges(charges); }
  }
  deleteCharge(id: string) { this.saveCharges(this.getCharges().filter(c => c.id !== id)); }

  /* ── Fund Config ── */
  getFundConfig(): FundConfig {
    const d = localStorage.getItem(FUND_KEY);
    return d ? JSON.parse(d) : { bankBalance: 0, lastUpdated: '' };
  }
  saveFundConfig(f: FundConfig) { localStorage.setItem(FUND_KEY, JSON.stringify(f)); }

  /** Total amount ever collected across all payments */
  getTotalPaymentsMarked(): number {
    return this.getPayments().reduce((s, p) => s + p.amountPaid, 0);
  }

  /** Total dues expected from all flats (opening balance + all months) */
  getTotalDuesExpected(): number {
    return this.getFlats().reduce((s, f) => {
      const start = new Date(START_MONTH + '-01');
      const now   = new Date();
      const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
      return s + f.openingBalance + months * f.monthlyAmount;
    }, 0);
  }

  /** Total pending = expected - paid */
  getTotalPending(): number {
    return Math.max(0, this.getTotalDuesExpected() - this.getTotalPaymentsMarked());
  }

  /** Charges applicable to a wing for a specific month */
  getChargesForWingMonth(wing: 'A' | 'B', month: string): MaintenanceCharge[] {
    return this.getCharges().filter(c => {
      if (!c.active) return false;
      if (wing === 'A' && !c.wingA) return false;
      if (wing === 'B' && !c.wingB) return false;
      return c.month === month;
    });
  }

  /** Short label: "Water Bill (Mar)" */
  getChargeLabel(c: MaintenanceCharge): string {
    const [y, m] = c.month.split('-');
    const mon = new Date(+y, +m - 1).toLocaleString('default', { month: 'short' });
    return `${c.label} (${mon})`;
  }

  /** Month dropdown options for a wing: standard months + charge months */
  getMonthOptionsForWing(wing: 'A' | 'B'): { value: string; label: string; isCharge: boolean; chargeId?: string; amount: number }[] {
    const standard = this.getAllMonths().map(m => ({ value: m, label: this.getMonthLabel(m), isCharge: false, amount: 0 }));
    const chargeOpts = this.getCharges()
      .filter(c => c.active && (wing === 'A' ? c.wingA : c.wingB))
      .map(c => ({ value: `charge:${c.id}`, label: this.getChargeLabel(c), isCharge: true, chargeId: c.id, amount: c.amount }));
    return [...standard, ...chargeOpts];
  }

  /* ── Helpers ── */
  getMonthLabel(month: string): string {
    const [y, m] = month.split('-');
    return new Date(+y, +m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }
  getStartMonth() { return START_MONTH; }

  getAllMonths(): string[] {
    const start = new Date(START_MONTH + '-01');
    const now   = new Date();
    const months: string[] = [];
    const cur = new Date(start);
    while (cur <= now) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }

  private initFlats(): Flat[] {
    const flats: Flat[] = [];
    (['A', 'B'] as ('A' | 'B')[]).forEach(wing => {
      for (let floor = 1; floor <= 7; floor++) {
        for (let pos = 1; pos <= 4; pos++) {
          const type   = pos <= 2 ? '1BHK' : '2BHK';
          const flatNo = `${wing}${floor}0${pos}`;
          flats.push({ id: flatNo, wing, floor, flatNo, ownerName: '', phone: '', type, monthlyAmount: type === '1BHK' ? 2580 : 3580, openingBalance: 0 });
        }
      }
    });
    this.saveFlats(flats);
    return flats;
  }
}
