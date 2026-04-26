import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { SocietyService, SocietyDetail } from '../../services/society.service';

@Component({
  selector: 'app-society-detail',
  templateUrl: 'society-detail.page.html',
  styleUrls: ['society-detail.page.scss'],
  standalone: false
})
export class SocietyDetailPage implements OnInit {
  detail!: SocietyDetail;
  editMode = false;
  editData!: SocietyDetail;
  amenityInput = '';

  constructor(private society: SocietyService, private menu: MenuController) {}

  ngOnInit() { this.detail = this.society.getDetail(); }
  ionViewWillEnter() { this.detail = this.society.getDetail(); }

  startEdit() { this.editData = JSON.parse(JSON.stringify(this.detail)); this.editMode = true; }
  save() { this.society.saveDetail(this.editData); this.detail = { ...this.editData }; this.editMode = false; }
  cancel() { this.editMode = false; }

  addAmenity() {
    const v = this.amenityInput.trim();
    if (v && !this.editData.amenities.includes(v)) { this.editData.amenities.push(v); }
    this.amenityInput = '';
  }
  removeAmenity(i: number) { this.editData.amenities.splice(i, 1); }
  openMenu() { this.menu.open('main-menu'); }
}
