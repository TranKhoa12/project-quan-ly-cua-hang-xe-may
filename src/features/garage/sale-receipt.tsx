import type {SaleRow} from './types';
import {saleTime,vndInWords} from './receipt-format';

const amount=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
export default function SaleReceipt({sale}:{sale:SaleRow}){
 const hasReturns=sale.items.some(i=>i.returned>0),cash=sale.payment_method==='cash';
 const received=cash&&typeof sale.cash_received==='number'&&sale.cash_received>=sale.total?sale.cash_received:null;
 return <article className="sale-receipt" aria-label={`Phiếu bán hàng BH-${sale.code}`}>
  <header className="receipt-store"><h2>{sale.store_snapshot.name}</h2>{sale.store_snapshot.address&&<p>{sale.store_snapshot.address}</p>}{sale.store_snapshot.phone&&<p>Điện thoại: {sale.store_snapshot.phone}</p>}</header>
  <div className="receipt-title"><h1>PHIẾU BÁN HÀNG</h1><p>Bán phụ tùng tại quầy</p></div>
  <dl className="receipt-info"><div><dt>Số phiếu</dt><dd>BH-{sale.code}</dd></div><div><dt>Ngày giờ</dt><dd>{saleTime(sale.created_at)}</dd></div><div><dt>Khách hàng</dt><dd>{sale.customer_name}</dd></div>{sale.cashier_name&&<div><dt>Người bán</dt><dd>{sale.cashier_name}</dd></div>}<div><dt>Thanh toán</dt><dd>{cash?'Tiền mặt':'Chuyển khoản'}</dd></div></dl>
  <table className="receipt-items"><colgroup><col className="receipt-col-index"/><col className="receipt-col-name"/><col className="receipt-col-qty"/><col className="receipt-col-price"/><col className="receipt-col-total"/></colgroup><thead><tr><th scope="col">STT</th><th scope="col">Tên hàng</th><th scope="col">SL</th><th scope="col">Đơn giá (đ)</th><th scope="col">Thành tiền (đ)</th></tr></thead><tbody>{sale.items.map((item,index)=><tr key={item.id}><td>{index+1}</td><td>{item.name}{item.returned>0&&<small>Đã trả: {item.returned}/{item.quantity}</small>}</td><td>{amount(item.quantity)}</td><td className={item.price>=1000000000?'receipt-long-amount':''}>{amount(item.price)}</td><td className={item.price*item.quantity>=1000000000?'receipt-long-amount':''}>{amount(item.price*item.quantity)}</td></tr>)}</tbody></table>
  <section className="receipt-summary" aria-label="Tổng thanh toán"><div><span>Tổng số lượng</span><strong>{amount(sale.items.reduce((s,i)=>s+i.quantity,0))}</strong></div><div className="receipt-grand-total"><span>{hasReturns?'Tổng tiền bán gốc':'Tổng thanh toán'}</span><strong>{amount(sale.total)} đ</strong></div><div><span>Đã thu khi bán</span><strong>{amount(sale.total)} đ</strong></div>{received!==null&&<><div><span>Tiền khách đưa</span><strong>{amount(received)} đ</strong></div><div><span>Tiền trả khách</span><strong>{amount(received-sale.total)} đ</strong></div></>}</section>
  <p className="receipt-in-words"><strong>Bằng chữ:</strong> {vndInWords(sale.total)}.</p>
  {hasReturns&&<p className="receipt-return-note">Có hàng đã trả. Phiếu này ghi số tiền bán gốc; đối chiếu chứng từ hoàn tiền riêng.</p>}
  <div className="receipt-signatures"><div><strong>Khách hàng</strong><small>(Ký, ghi rõ họ tên)</small></div><div><strong>Người bán</strong><small>(Ký, ghi rõ họ tên)</small></div></div>
  <footer className="receipt-footer"><strong>Cảm ơn quý khách!</strong><p>Vui lòng giữ phiếu để đối chiếu giao dịch.</p></footer>
 </article>;
}
