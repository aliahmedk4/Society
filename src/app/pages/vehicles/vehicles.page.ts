import { Component } from '@angular/core';
import { AlertController, MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Vehicle, Flat } from '../../services/society.service';

export interface FlatBlock  { flat: Flat; vehicles: Vehicle[]; }
export interface FloorGroup { floor: number; blocks: FlatBlock[]; }
export interface WingGroup  { wing: 'A' | 'B'; floors: FloorGroup[]; totalVehicles: number; }

@Component({
  selector: 'app-vehicles',
  templateUrl: 'vehicles.page.html',
  styleUrls: ['vehicles.page.scss'],
  standalone: false
})
export class VehiclesPage {
  wings: WingGroup[] = [];
  allVehicles: Vehicle[] = [];
  selectedWing: 'A' | 'B' = 'A';
  filterType: 'all' | 'car' | 'bike' = 'all';
  searchTerm = '';
  viewMode: 'list' | 'block' = 'list';

  /* Inline add form */
  showForm = false;
  formFlat: Flat | null = null;
  form = { vehicleNo: '', model: '', type: 'car' as 'car' | 'bike' };

  constructor(
    private society: SocietyService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private menu: MenuController
  ) {}

  ionViewWillEnter() { this.load(); }

  load() {
    const flats    = this.society.getFlats();
    const vehicles = this.society.getVehicles();
    this.allVehicles = vehicles;

    this.wings = (['A', 'B'] as ('A' | 'B')[]).map(wing => {
      const wingFlats = flats.filter(f => f.wing === wing);
      const floors    = [...new Set(wingFlats.map(f => f.floor))].sort((a, b) => a - b);
      const floorGroups: FloorGroup[] = floors.map(floor => ({
        floor,
        blocks: wingFlats
          .filter(f => f.floor === floor)
          .sort((a, b) => a.flatNo.localeCompare(b.flatNo))
          .map(flat => ({
            flat,
            vehicles: vehicles.filter(v =>
              v.flatId === flat.id &&
              (this.filterType === 'all' || v.type === this.filterType) &&
              (!this.searchTerm || this.matchSearch(v))
            )
          }))
      }));
      return {
        wing, floors: floorGroups,
        totalVehicles: vehicles.filter(v => wingFlats.some(f => f.id === v.flatId)).length
      };
    });
  }

  matchSearch(v: Vehicle): boolean {
    const t = this.searchTerm.toLowerCase();
    return v.vehicleNo.toLowerCase().includes(t) || v.flatNo.toLowerCase().includes(t) ||
      v.ownerName.toLowerCase().includes(t) || v.model.toLowerCase().includes(t);
  }

  /** Flat list of vehicles for the selected wing — used in list view */
  get flatVehicleList(): Vehicle[] {
    const wingFlats = this.society.getFlats().filter(f => f.wing === this.selectedWing);
    return this.allVehicles.filter(v => {
      const inWing = wingFlats.some(f => f.id === v.flatId);
      const matchType = this.filterType === 'all' || v.type === this.filterType;
      const matchSearch = !this.searchTerm || this.matchSearch(v);
      return inWing && matchType && matchSearch;
    });
  }

  get activeWing(): WingGroup { return this.wings.find(w => w.wing === this.selectedWing) || this.wings[0]; }
  get carCount()  { return this.allVehicles.filter(v => v.type === 'car').length; }
  get bikeCount() { return this.allVehicles.filter(v => v.type === 'bike').length; }
  floorVehicleCount(fg: FloorGroup) { return fg.blocks.reduce((s, b) => s + b.vehicles.length, 0); }

  onFilterChange() { this.load(); }
  toggleView() { this.viewMode = this.viewMode === 'list' ? 'block' : 'list'; }

  openAddForm(flat: Flat) {
    this.formFlat = flat;
    this.form = { vehicleNo: '', model: '', type: 'car' };
    this.showForm = true;
  }

  openAddFormFromList() {
    // pick first flat of selected wing as default, user can change
    const flats = this.society.getFlats().filter(f => f.wing === this.selectedWing);
    if (!flats.length) return;
    this.formFlat = flats[0];
    this.form = { vehicleNo: '', model: '', type: 'car' };
    this.showForm = true;
  }

  cancelForm() { this.showForm = false; this.formFlat = null; }

  saveVehicle() {
    if (!this.form.vehicleNo.trim()) { this.showToast('Enter vehicle number', 'warning'); return; }
    this.society.addVehicle({
      flatId: this.formFlat!.id, flatNo: this.formFlat!.flatNo,
      ownerName: this.formFlat!.ownerName,
      type: this.form.type,
      vehicleNo: this.form.vehicleNo.trim().toUpperCase(),
      model: this.form.model.trim()
    });
    this.showToast(`🚗 Vehicle added to ${this.formFlat!.flatNo}`, 'success');
    this.showForm = false;
    this.formFlat = null;
    this.load();
  }

  async deleteVehicle(v: Vehicle) {
    const alert = await this.alertCtrl.create({
      header: 'Remove Vehicle',
      message: `Remove ${v.vehicleNo} (${v.model || v.type}) from ${v.flatNo}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Remove', role: 'destructive', handler: () => {
          this.society.deleteVehicle(v.id);
          this.load();
          this.showToast('Vehicle removed', 'danger');
        }}
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    t.present();
  }

  openMenu() { this.menu.open('main-menu'); }
}
