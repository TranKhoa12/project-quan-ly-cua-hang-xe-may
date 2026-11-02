'use client';
import {useEffect,useId,useState} from 'react';
import {createPortal} from 'react-dom';
import {Printer} from 'lucide-react';
import SaleReceipt from './sale-receipt';
import {receiptPageStyle} from './receipt-format';
import type {SaleRow} from './types';

export default function SaleReceiptPrint({sale}:{sale:SaleRow}){
 const [paper,setPaper]=useState<'A5'|'A4'>('A5'),[printing,setPrinting]=useState(false),[error,setError]=useState('');const id=useId();
 useEffect(()=>{
  if(!printing)return;
  const oldTitle=document.title;document.title=`Phieu ban BH-${sale.code}`;
  let cancelled=false;const done=()=>setPrinting(false);
  window.addEventListener('afterprint',done);
  void document.fonts.ready.then(()=>{requestAnimationFrame(()=>{if(cancelled)return;try{window.print();}catch{setError('Không mở được hộp thoại in. Hãy thử lại.');setPrinting(false);}});});
  return()=>{cancelled=true;document.title=oldTitle;window.removeEventListener('afterprint',done);};
 },[printing,sale.code]);
 return <><div className="receipt-print-actions no-print"><label htmlFor={id}>Khổ giấy<select id={id} value={paper} disabled={printing} onChange={e=>setPaper(e.target.value as 'A5'|'A4')}><option value="A5">A5</option><option value="A4">A4</option></select></label><button type="button" className="button" disabled={printing} onClick={()=>{if(document.querySelector('.sale-print-surface')){setError('Một phiếu khác đang mở hộp thoại in. Hãy đóng hộp thoại đó trước.');return;}setError('');setPrinting(true);}}><Printer size={16}/>{printing?'Đang mở bản in…':'In phiếu'}</button></div>{error&&<p className="auth-error" role="alert">{error}</p>}
 {printing&&createPortal(<div className={`sale-print-surface receipt-paper-${paper.toLowerCase()}`}><style>{receiptPageStyle(paper,sale.code)}</style><SaleReceipt sale={sale}/></div>,document.body)}
 </>;
}
