import { Component } from '@angular/core';
import { AlertController, MenuController, ToastController } from '@ionic/angular';
import { SocietyService, Vehicle, Flat } from '../../services/society.service';

export interface FlatBlock {
  flat: Flat;
  vehicles: Vehicle[];
}

export interface FloorGroup {
  floor: number;
  blocks: FlatBlock[];
}

export interface WingGroup {
  wing: 'A' | 'B';
  floors: FloorGroup[];
  totalVehicles: number;
}

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

  constructor(
    private society: SocietyService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private menu: MenuController
  ) {}

  ionViewWillEnter() { this.load(); }

  load() {
    const flats = this.society.getFlats();
    const vehicles = this.society.getVehicles();
    this.allVehicles = vehicles;

    this.wings = (['A', 'B'] as ('A' | 'B')[]).map(wing => {
      const wingFlats = flats.filter(f => f.wing === wing);
      const floors = [...new Set(wingFlats.map(f => f.floor))].sort((a, b) => a - b);
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
        wing,
        floors: floorGroups,
        totalVehicles: vehicles.filter(v => wingFlats.some(f => f.id === v.flatId)).length
      };
    });
  }

  matchSearch(v: Vehicle): boolean {
    const t = this.searchTerm.toLowerCase();
    return v.vehicleNo.toLowerCase().includes(t) ||
      v.flatNo.toLowerCase().includes(t) ||
      v.ownerName.toLowerCase().includes(t) ||
      v.model.toLowerCase().includes(t);
  }

  get activeWing(): WingGroup {
    return this.wings.find(w => w.wing === this.selectedWing) || this.wings[0];
  }

  get carCount() { return this.allVehicles.filter(v => v.type === 'car').length; }
  get bikeCount() { return this.allVehicles.filter(v => v.type === 'bike').length; }

  floorVehicleCount(floorGroup: FloorGroup): number {
    return floorGroup.blocks.reduce((s, b) => s + b.vehicles.length, 0);
  }

  onFilterChange() { this.load(); }

  async addVehicleToFlat(flat: Flat) {
    const alert = await this.alertCtrl.create({
      header: `Add Vehicle — ${flat.flatNo}`,
      subHeader: flat.ownerName || 'No owner set',
      inputs: [
        { name: 'vehicleNo', type: 'text', placeholder: 'Vehicle No. (e.g. GJ01AB1234)' },
        { name: 'model', type: 'text', placeholder: 'Model (e.g. Honda City)' },
        { name: 'type', type: 'radio', label: '🚗 Car', value: 'car', checked: true },
        { name: 'type', type: 'radio', label: '🏍 Bike', value: 'bike' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Add', handler: (data): boolean => {
          if (!data.vehicleNo?.trim()) return false;
          this.society.addVehicle({
            flatId: flat.id, flatNo: flat.flatNo, ownerName: flat.ownerName,
            type: data.type || 'car',
            vehicleNo: data.vehicleNo.trim().toUpperCase(),
            model: data.model || ''
          });
          this.load();
          this.showToast(`Vehicle added to ${flat.flatNo}`, 'success');
          return true;
        }}
      ]
    });
    await alert.present();
  }

  async deleteVehicle(v: Vehicle) {
    const alert = await this.alertCtrl.create({
      header: 'Remove Vehicle',
      message: `Remove ${v.vehicleNo} from ${v.flatNo}?`,
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
