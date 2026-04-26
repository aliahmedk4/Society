import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, Platform, ToastController } from '@ionic/angular';
import { SocietyService, Flat, Payment } from '../../services/society.service';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Component({
  selector: 'app-receipt',
  templateUrl: 'receipt.page.html',
  styleUrls: ['receipt.page.scss'],
  standalone: false
})
export class ReceiptPage implements OnInit {
  flats: Flat[] = [];
  selectedFlat: Flat | null = null;
  payments: Payment[] = [];
  searchTerm = '';

  constructor(
    private society: SocietyService,
    private router: Router,
    private menu: MenuController,
    private platform: Platform,
    private toast: ToastController
  ) {}

  ngOnInit() { this.flats = this.society.getFlats(); }
  ionViewWillEnter() { this.flats = this.society.getFlats(); }

  get filteredFlats(): Flat[] {
    const term = this.searchTerm.toLowerCase();
    return this.flats.filter(f =>
      f.flatNo.toLowerCase().includes(term) || f.ownerName.toLowerCase().includes(term)
    );
  }

  selectFlat(flat: Flat) {
    this.selectedFlat = flat;
    this.payments = this.society.getPaymentsForFlat(flat.id)
      .sort((a, b) => b.paidDate.localeCompare(a.paidDate));
  }

  getMonthLabel(m: string) { return this.society.getMonthLabel(m); }
  getTotalDue(flat: Flat) { return this.society.getTotalDue(flat); }
  openMenu() { this.menu.open('main-menu'); }
  go(page: string) { this.router.navigate(['/app', page]); }

  async printReceipt(payment: Payment) {
    const html = this.buildReceiptHtml(payment);

    if (this.platform.is('capacitor')) {
      // ── Android / iOS ──
      try {
        const fileName = `receipt_${payment.receiptNo}.html`;
        await Filesystem.writeFile({
          path: fileName,
          data: html,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        await Share.share({
          title: `Receipt ${payment.receiptNo}`,
          text: `Payment receipt for ${this.selectedFlat?.flatNo} — ${payment.receiptNo}`,
          url: uri,
          dialogTitle: 'Share or Save Receipt'
        });
      } catch {
        // Fallback: open as base64 data URI in in-app browser
        const b64 = btoa(unescape(encodeURIComponent(html)));
        await Browser.open({ url: `data:text/html;base64,${b64}` });
      }
    } else {
      // ── Web browser ──
      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, '_blank');
      if (win) win.addEventListener('load', () => URL.revokeObjectURL(url));
    }
  }

  private buildReceiptHtml(payment: Payment): string {
    const flat       = this.selectedFlat!;
    const detail     = this.society.getDetail();
    const paidDate   = new Date(payment.paidDate);
    const dateStr    = paidDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr    = paidDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const isCharge   = payment.month.startsWith('charge:');
    const monthLabel = isCharge ? (payment.note || 'Special Charge') : this.getMonthLabel(payment.month);
    const words      = this.toWords(payment.amountPaid);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt — ${payment.receiptNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;display:flex;justify-content:center;padding:24px 12px;min-height:100vh}
    .receipt{background:white;width:100%;max-width:580px;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.15)}
    /* Header */
    .rh{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%);padding:24px 28px 20px;position:relative;overflow:hidden}
    .rh::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.08)}
    .rh::after{content:'';position:absolute;bottom:-70px;left:-40px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,0.05)}
    .rh-top{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
    .rh-logo{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
    .rh-name{font-size:18px;font-weight:800;color:white}
    .rh-addr{font-size:11px;color:rgba(255,255,255,0.75);margin-top:3px}
    .rh-reg{font-size:10px;color:rgba(255,255,255,0.6);margin-top:2px}
    .rh-div{height:1px;background:rgba(255,255,255,0.2);margin:16px 0;position:relative;z-index:1}
    .rh-bot{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
    .rh-title{font-size:20px;font-weight:900;color:white;letter-spacing:1px;text-transform:uppercase}
    .rh-rcpt{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:5px 12px;font-size:11px;color:white;font-weight:700}
    /* Flat strip */
    .fstrip{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 28px;display:flex;gap:0}
    .fsi{flex:1;border-right:1px solid #e2e8f0;padding:0 12px}
    .fsi:first-child{padding-left:0}
    .fsi:last-child{border-right:none}
    .fsi-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px}
    .fsi-val{font-size:13px;font-weight:800;color:#1e293b;margin-top:3px}
    /* Body */
    .rbody{padding:24px 28px}
    /* Amount box */
    .abox{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:14px;padding:18px 22px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
    .abox-lbl{font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.8px}
    .abox-amt{font-size:30px;font-weight:900;color:#15803d;margin-top:4px}
    .abox-words{font-size:10px;color:#4ade80;margin-top:3px;font-style:italic}
    .abox-icon{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#15803d);display:flex;align-items:center;justify-content:center;font-size:24px}
    /* Stamp */
    .stamp-row{display:flex;justify-content:flex-end;margin-bottom:20px}
    .stamp{border:3px solid #16a34a;border-radius:10px;padding:7px 18px;color:#16a34a;font-size:15px;font-weight:900;letter-spacing:2px;text-transform:uppercase;transform:rotate(-3deg);display:inline-block}
    /* Details table */
    .sec-title{font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1.4px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    tr{border-bottom:1px solid #f1f5f9}
    tr:last-child{border-bottom:none}
    td{padding:9px 0;font-size:13px}
    td:first-child{color:#64748b;font-weight:600;width:45%}
    td:last-child{color:#1e293b;font-weight:700;text-align:right}
    /* Signature */
    .sig-row{display:flex;justify-content:space-between;margin-top:28px;padding-top:18px;border-top:1px dashed #e2e8f0}
    .sig-item{text-align:center}
    .sig-line{width:110px;height:1px;background:#1e293b;margin:0 auto 6px}
    .sig-lbl{font-size:10px;color:#64748b;font-weight:600}
    /* Footer */
    .rfooter{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;display:flex;justify-content:space-between;align-items:center}
    .rf-l{font-size:10px;color:#94a3b8;line-height:1.6}
    .rf-l strong{color:#475569}
    .rf-r{font-size:10px;color:#94a3b8;text-align:right;line-height:1.6}
    /* Print bar */
    .pbar{text-align:center;padding:18px;background:white}
    .pbtn{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;border:none;border-radius:12px;padding:13px 28px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(79,70,229,0.35)}
    @media print{body{background:white;padding:0}.receipt{box-shadow:none;border-radius:0;max-width:100%}.pbar{display:none}}
  </style>
</head>
<body>
<div class="receipt">
  <div class="rh">
    <div class="rh-top">
      <div class="rh-logo">&#127962;</div>
      <div>
        <div class="rh-name">${detail.name}</div>
        <div class="rh-addr">${detail.address}, ${detail.city}</div>
        <div class="rh-reg">Reg: ${detail.registrationNo} &bull; Est. ${detail.established}</div>
      </div>
    </div>
    <div class="rh-div"></div>
    <div class="rh-bot">
      <div class="rh-title">Payment Receipt</div>
      <div class="rh-rcpt">${payment.receiptNo}</div>
    </div>
  </div>

  <div class="fstrip">
    <div class="fsi"><div class="fsi-lbl">Flat No.</div><div class="fsi-val">${flat.flatNo}</div></div>
    <div class="fsi"><div class="fsi-lbl">Wing</div><div class="fsi-val">Wing ${flat.wing}</div></div>
    <div class="fsi"><div class="fsi-lbl">Floor</div><div class="fsi-val">Floor ${flat.floor}</div></div>
    <div class="fsi"><div class="fsi-lbl">Type</div><div class="fsi-val">${flat.type}</div></div>
  </div>

  <div class="rbody">
    <div class="abox">
      <div>
        <div class="abox-lbl">Amount Paid</div>
        <div class="abox-amt">&#8377;${payment.amountPaid.toLocaleString('en-IN')}</div>
        <div class="abox-words">${words} Only</div>
      </div>
      <div class="abox-icon">&#10004;</div>
    </div>

    <div class="stamp-row"><div class="stamp">Paid</div></div>

    <div class="sec-title">Payment Details</div>
    <table>
      <tr><td>Owner Name</td><td>${flat.ownerName || 'N/A'}</td></tr>
      <tr><td>Phone</td><td>${flat.phone || 'N/A'}</td></tr>
      <tr><td>For Month / Charge</td><td>${monthLabel}</td></tr>
      <tr><td>Payment Date</td><td>${dateStr}</td></tr>
      <tr><td>Payment Time</td><td>${timeStr}</td></tr>
      <tr><td>Monthly Maintenance</td><td>&#8377;${flat.monthlyAmount.toLocaleString('en-IN')}</td></tr>
      ${payment.note ? `<tr><td>Note</td><td>${payment.note}</td></tr>` : ''}
    </table>

    <div class="sig-row">
      <div class="sig-item"><div class="sig-line"></div><div class="sig-lbl">Resident Signature</div></div>
      <div class="sig-item"><div class="sig-line"></div><div class="sig-lbl">Authorised Signatory</div></div>
    </div>
  </div>

  <div class="rfooter">
    <div class="rf-l"><strong>${detail.secretary}</strong> &mdash; Secretary<br>Generated: ${new Date().toLocaleString('en-IN')}</div>
    <div class="rf-r">${detail.phone}<br>${detail.email}</div>
  </div>
</div>

<div class="pbar">
  <button class="pbtn" onclick="window.print()">&#128424; &nbsp; Print / Save as PDF</button>
</div>
</body>
</html>`;
  }

  private toWords(amount: number): string {
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
      'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    if (amount === 0) return 'Zero';
    const c = (n: number): string => {
      if (n < 20)      return ones[n];
      if (n < 100)     return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '');
      if (n < 1000)    return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+c(n%100) : '');
      if (n < 100000)  return c(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+c(n%1000) : '');
      if (n < 10000000)return c(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+c(n%100000) : '');
      return c(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' '+c(n%10000000) : '');
    };
    return 'Rupees ' + c(Math.floor(amount));
  }
}
