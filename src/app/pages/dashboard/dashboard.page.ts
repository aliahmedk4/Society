import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { SocietyService, Notice } from '../../services/society.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  currentMonth = '';
  totalFlats = 0; paidCount = 0; unpaidCount = 0;
  totalCollected = 0; totalExpected = 0; totalPending = 0;
  wingASummary = { paid: 0, unpaid: 0 };
  wingBSummary = { paid: 0, unpaid: 0 };
  recentNotices: Notice[] = [];
  totalOutstanding = 0;
  monthExpenses = 0;
  // Fund summary
  fundTotalDues = 0;
  fundPaymentsMarked = 0;
  fundPending = 0;
  fundBankBalance = 0;
  fundLastUpdated = '';

  constructor(private society: SocietyService, private router: Router, private menu: MenuController) {}

  ngOnInit() {
    const now = new Date();
    this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.loadSummary();
  }

  ionViewWillEnter() { this.loadSummary(); }

  loadSummary() {
    const flats = this.society.getFlats();
    const payments = this.society.getPaymentsForMonth(this.currentMonth);
    this.totalFlats = flats.length;
    this.paidCount = payments.length;
    this.unpaidCount = this.totalFlats - this.paidCount;
    this.totalCollected = payments.reduce((s, p) => s + p.amountPaid, 0);
    this.totalExpected = flats.reduce((s, f) => s + f.monthlyAmount, 0);
    this.totalPending = this.totalExpected - this.totalCollected;
    this.totalOutstanding = flats.reduce((s, f) => s + this.society.getTotalDue(f), 0);
    const aFlats = flats.filter(f => f.wing === 'A');
    const bFlats = flats.filter(f => f.wing === 'B');
    this.wingASummary = {
      paid: aFlats.filter(f => this.society.isPaid(f.id, this.currentMonth)).length,
      unpaid: aFlats.filter(f => !this.society.isPaid(f.id, this.currentMonth)).length
    };
    this.wingBSummary = {
      paid: bFlats.filter(f => this.society.isPaid(f.id, this.currentMonth)).length,
      unpaid: bFlats.filter(f => !this.society.isPaid(f.id, this.currentMonth)).length
    };
    this.recentNotices = this.society.getNotices().slice(0, 3);
    this.monthExpenses = this.society.getMonthExpenses(this.currentMonth);
    // Fund summary
    const fund = this.society.getFundConfig();
    this.fundTotalDues      = this.society.getTotalDuesExpected();
    this.fundPaymentsMarked = this.society.getTotalPaymentsMarked();
    this.fundPending        = this.society.getTotalPending();
    this.fundBankBalance    = fund.bankBalance;
    this.fundLastUpdated    = fund.lastUpdated;
  }

  get monthLabel() { return this.society.getMonthLabel(this.currentMonth); }
  get paidPercent() { return this.totalFlats ? Math.round((this.paidCount / this.totalFlats) * 100) : 0; }
  get netBalance() { return this.totalCollected - this.monthExpenses; }

  openMenu() { this.menu.open('main-menu'); }
  go(page: string) { this.router.navigate(['/app', page]); }
}
