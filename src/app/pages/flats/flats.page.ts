import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Flat, Vehicle } from '../../services/society.service';

export interface MonthOption { value: string; label: string; isCharge: boolean; chargeId?: string; amount: number; }

@Component({
  selector: 'app-flats',
  templateUrl: 'flats.page.html',
  styleUrls: ['flats.page.scss'],
  standalone: false
})
export class FlatsPage implements OnInit {
  selectedWing: 'A' | 'B' = 'A';
  selectedMonth = '';
  monthOptions: MonthOption[] = [];
  allMonths: string[] = [];
  flats: Flat[] = [];
  paidThisMonth = 0; unpaidThisMonth = 0; collectedThisMonth = 0;
  bulkMode = false;
  selectedIds: Set<string> = new Set();
  expandedFloors: Set<number> = new Set(); // default all collapsed
  /* Inline edit form */
  editingFlat: Flat | null = null;
  editForm = { ownerName: '', phone: '', openingBalance: 0, monthlyAmount: 0 };
  vehicleMap: Record<string, Vehicle[]> = {};
  /* Inline vehicle form */
  vehicleFlat: Flat | null = null;
  vehicleForm = { vehicleNo: '', model: '', type: 'car' as 'car' | 'bike' };

  constructor(private society: SocietyService, private alertCtrl: AlertController, private toastCtrl: ToastController, private router: Router, private menu: MenuController) {}

  ngOnInit() {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.allMonths = this.society.getAllMonths();
    this.refreshMonthOptions();
    this.loadFlats();
  }

  ionViewWillEnter() { this.refreshMonthOptions(); this.loadFlats(); }

  refreshMonthOptions() {
    this.monthOptions = this.society.getMonthOptionsForWing(this.selectedWing);
    // if current selectedMonth is a standard month, keep it; otherwise reset
    if (!this.monthOptions.find(o => o.value === this.selectedMonth)) {
      const now = new Date();
      this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  onWingChange() { this.refreshMonthOptions(); this.loadFlats(); }

  loadFlats() {
    this.flats = this.society.getFlats().filter(f => f.wing === this.selectedWing);
    const payments = this.society.getPaymentsForMonth(this.selectedMonth).filter(p => this.flats.some(f => f.id === p.flatId));
    this.paidThisMonth = payments.length;
    this.unpaidThisMonth = this.flats.length - this.paidThisMonth;
    this.collectedThisMonth = payments.reduce((s, p) => s + p.amountPaid, 0);
    this.selectedIds.clear();
    const allVehicles = this.society.getVehicles();
    this.vehicleMap = {};
    allVehicles.forEach(v => {
      if (!this.vehicleMap[v.flatId]) this.vehicleMap[v.flatId] = [];
      this.vehicleMap[v.flatId].push(v);
    });
  }

  getVehiclesForFlat(flat: Flat): Vehicle[] { return this.vehicleMap[flat.id] || []; }

  async addVehicleToFlat(flat: Flat) {
    this.vehicleFlat = flat;
    this.vehicleForm = { vehicleNo: '', model: '', type: 'car' };
  }

  cancelVehicleForm() { this.vehicleFlat = null; }

  saveVehicle() {
    if (!this.vehicleForm.vehicleNo.trim()) { this.showToast('Enter vehicle number', 'warning'); return; }
    this.society.addVehicle({
      flatId: this.vehicleFlat!.id,
      flatNo: this.vehicleFlat!.flatNo,
      ownerName: this.vehicleFlat!.ownerName,
      type: this.vehicleForm.type,
      vehicleNo: this.vehicleForm.vehicleNo.trim().toUpperCase(),
      model: this.vehicleForm.model.trim()
    });
    this.showToast(`🚗 Vehicle added to ${this.vehicleFlat!.flatNo}`, 'success');
    this.vehicleFlat = null;
    this.loadFlats();
  }

  get isChargeMonth(): boolean { return this.selectedMonth.startsWith('charge:'); }

  getChargeAmount(): number {
    const opt = this.monthOptions.find(o => o.value === this.selectedMonth);
    return opt?.amount || 0;
  }

  getEffectivePayAmount(flat: Flat): number {
    if (this.isChargeMonth) return this.getChargeAmount();
    return flat.monthlyAmount;
  }

  get floors() { return [...new Set(this.flats.map(f => f.floor))].sort((a, b) => a - b); }
  getFlatsForFloor(floor: number) { return this.flats.filter(f => f.floor === floor); }
  isPaid(flat: Flat) { return this.society.isPaid(flat.id, this.selectedMonth); }
  getMonthLabel(m: string) { return this.society.getMonthLabel(m); }
  getTotalDue(flat: Flat) { return this.society.getTotalDue(flat); }

  isFloorExpanded(floor: number) { return this.expandedFloors.has(floor); }
  toggleFloor(floor: number) {
    this.expandedFloors.has(floor) ? this.expandedFloors.delete(floor) : this.expandedFloors.add(floor);
  }
  expandAll()   { this.floors.forEach(f => this.expandedFloors.add(f)); }
  collapseAll() { this.expandedFloors.clear(); }

  floorPaidCount(floor: number)   { return this.getFlatsForFloor(floor).filter(f => this.isPaid(f)).length; }
  floorUnpaidCount(floor: number) { return this.getFlatsForFloor(floor).filter(f => !this.isPaid(f)).length; }

  toggleBulkMode() { this.bulkMode = !this.bulkMode; this.selectedIds.clear(); }
  toggleSelect(flat: Flat) { if (this.isPaid(flat)) return; this.selectedIds.has(flat.id) ? this.selectedIds.delete(flat.id) : this.selectedIds.add(flat.id); }
  isSelected(flat: Flat) { return this.selectedIds.has(flat.id); }
  selectAll() { this.flats.filter(f => !this.isPaid(f)).forEach(f => this.selectedIds.add(f.id)); }
  clearSelection() { this.selectedIds.clear(); }
  get selectedCount() { return this.selectedIds.size; }
  get selectedTotal() { return this.flats.filter(f => this.selectedIds.has(f.id)).reduce((s, f) => s + f.monthlyAmount, 0); }

  async submitBulkPayment() {
    if (!this.selectedIds.size) return;
    const alert = await this.alertCtrl.create({
      header: `Bulk Payment — ${this.selectedIds.size} flats`,
      subHeader: `Total: ₹${this.selectedTotal.toLocaleString('en-IN')}`,
      inputs: [{ name: 'note', type: 'text', placeholder: 'Note (optional)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Confirm', handler: (data) => {
          this.flats.filter(f => this.selectedIds.has(f.id)).forEach(f => {
            this.society.addPayment({ flatId: f.id, month: this.selectedMonth, amountPaid: f.monthlyAmount, paidDate: new Date().toISOString(), note: data.note || '' });
          });
          this.showToast(`✅ ${this.selectedIds.size} payments marked`, 'success');
          this.bulkMode = false; this.loadFlats();
        }}
      ]
    });
    await alert.present();
  }

  async markPayment(flat: Flat) {
    if (this.bulkMode) { this.toggleSelect(flat); return; }
    if (this.isPaid(flat)) { this.showToast(`${flat.flatNo} already paid`, 'warning'); return; }
    const payAmount = this.getEffectivePayAmount(flat);
    const opt = this.monthOptions.find(o => o.value === this.selectedMonth);
    const alert = await this.alertCtrl.create({
      header: `Pay — ${flat.flatNo}`,
      subHeader: `${flat.ownerName || 'No owner'} · ${opt?.label || this.selectedMonth}`,
      inputs: [
        { name: 'amount', type: 'number', value: payAmount },
        { name: 'note', type: 'text', placeholder: 'Note (optional)' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Confirm', handler: (data) => {
          const month = this.isChargeMonth ? opt!.chargeId! : this.selectedMonth;
          this.society.addPayment({ flatId: flat.id, month, amountPaid: +data.amount, paidDate: new Date().toISOString(), note: data.note || '' });
          this.loadFlats(); this.showToast(`✅ ${flat.flatNo} marked paid`, 'success');
        }}
      ]
    });
    await alert.present();
  }

  async editFlat(flat: Flat) {
    this.editingFlat = flat;
    this.editForm = {
      ownerName: flat.ownerName,
      phone: flat.phone,
      openingBalance: flat.openingBalance,
      monthlyAmount: flat.monthlyAmount
    };
  }

  saveEditFlat() {
    if (!this.editingFlat) return;
    const flats = this.society.getFlats();
    const idx = flats.findIndex(f => f.id === this.editingFlat!.id);
    flats[idx] = {
      ...flats[idx],
      ownerName: this.editForm.ownerName,
      phone: this.editForm.phone,
      openingBalance: +this.editForm.openingBalance,
      monthlyAmount: +this.editForm.monthlyAmount
    };
    this.society.saveFlats(flats);
    this.editingFlat = null;
    this.loadFlats();
    this.showToast('Flat updated', 'success');
  }

  cancelEdit() { this.editingFlat = null; }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    t.present();
  }

  openMenu() { this.menu.open('main-menu'); }
  go(page: string) { this.router.navigate(['/app', page]); }
}
