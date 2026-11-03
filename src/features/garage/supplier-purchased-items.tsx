'use client';
import {useEffect,useState} from 'react';
import {loadSupplierItems} from './actions';
import type {SupplierPurchaseItem} from './types';
import {money} from '@/lib/data';

export default function SupplierPurchasedItems({supplierId,supplierName,availableIds,onAdd,disabled}:{supplierId:string;supplierName:string;availableIds:string[];onAdd:(id:string)=>void;disabled:boolean}){
 const [page,setPage]=useState(0),[retry,setRetry]=useState(0);
 const [state,setState]=useState<{loading:boolean;items:SupplierPurchaseItem[];total:number;error?:string}>({loading:true,items:[],total:0});
 useEffect(()=>{
  let active=true;
  setState({loading:true,items:[],total:0});
  loadSupplierItems(supplierId,page).then(result=>{if(active)setState({loading:false,items:result.items||[],total:result.total||0,error:result.error});}).catch(()=>{if(active)setState({loading:false,items:[],total:0,error:'Không tải được danh sách. Vui lòng thử lại.'});});
  return ()=>{active=false;};
 },[supplierId,page,retry]);
 return <section className="supplier-purchased-items" aria-label={`Hàng đã nhập từ ${supplierName}`}><div className="purchase-picker-heading"><strong>Hàng của {supplierName}</strong><span>Giá nhập lần trước để đối chiếu</span></div>
  {state.loading?<p role="status">Đang tải hàng đã nhập…</p>:state.error?<div><p className="auth-error" role="alert">{state.error}</p><button type="button" className="button" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>:!state.total?<p>Chưa nhập hàng từ nhà cung cấp này. Tìm hàng hoặc thêm hàng mới bên dưới.</p>:<>
   <div className="purchase-picker-list">{state.items.map(item=><div className="purchase-supplier-item" key={item.part_id}><div><strong>{item.name}</strong><small>{item.brand} · {item.sku}</small><small>Đã nhập {item.quantity.toLocaleString('vi-VN')} · {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(item.last_received_at))}</small></div><span className="purchase-previous-cost">{money(item.last_cost)}</span>{availableIds.includes(item.part_id)?<button type="button" className="button" disabled={disabled} aria-label={`Thêm ${item.name} vào phiếu nhập`} onClick={()=>onAdd(item.part_id)}>+ Thêm</button>:<small>Hàng ngoài danh sách chọn hiện tại</small>}</div>)}</div>
   <div className="live-pager"><span>{state.total} mặt hàng · Trang {page+1}/{Math.max(1,Math.ceil(state.total/20))}</span><button type="button" className="button" disabled={page===0} onClick={()=>setPage(n=>n-1)}>Trước</button><button type="button" className="button" disabled={(page+1)*20>=state.total} onClick={()=>setPage(n=>n+1)}>Sau</button></div>
  </>}
 </section>;
}
