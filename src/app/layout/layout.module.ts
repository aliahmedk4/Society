import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { LayoutPage } from './layout.page';

const routes: Routes = [
  {
    path: '',
    component: LayoutPage,
    children: [
      { path: 'dashboard',      loadChildren: () => import('../pages/dashboard/dashboard.module').then(m => m.DashboardPageModule) },
      { path: 'flats',          loadChildren: () => import('../pages/flats/flats.module').then(m => m.FlatsPageModule) },
      { path: 'dues',           loadChildren: () => import('../pages/dues/dues.module').then(m => m.DuesPageModule) },
      { path: 'receipt',        loadChildren: () => import('../pages/receipt/receipt.module').then(m => m.ReceiptPageModule) },
      { path: 'expenses',       loadChildren: () => import('../pages/expenses/expenses.module').then(m => m.ExpensesPageModule) },
      { path: 'vehicles',       loadChildren: () => import('../pages/vehicles/vehicles.module').then(m => m.VehiclesPageModule) },
      { path: 'notices',        loadChildren: () => import('../pages/notices/notices.module').then(m => m.NoticesPageModule) },
      { path: 'society-detail', loadChildren: () => import('../pages/society-detail/society-detail.module').then(m => m.SocietyDetailPageModule) },
      { path: 'pay-dues',       loadChildren: () => import('../pages/pay-dues/pay-dues.module').then(m => m.PayDuesPageModule) },
      { path: 'config',         loadChildren: () => import('../pages/config/config.module').then(m => m.ConfigPageModule) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [LayoutPage]
})
export class LayoutModule {}
