'use client';
import {capitalizeWords} from '@/lib/text-input';
import {useEffect,useRef,useState} from 'react';
import {CommandForm} from './command-form';
import type {SupplierRow} from './types';

export default function SupplierDetailsEditor({supplier,onSaved,onDeleted,onCancel}:{supplier:SupplierRow;onSaved:(supplier:SupplierRow)=>void;onDeleted:()=>void;onCancel:()=>void}){
 const [deleting,setDeleting]=useState(false),[confirmed,setConfirmed]=useState(false);
 const [name,setName]=useState(supplier.name),[phone,setPhone]=useState(supplier.phone);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{root.current?.querySelector<HTMLInputElement>('input')?.focus();root.current?.scrollIntoView({block:'nearest'});},[]);
 if(deleting)return <div className="purchase-supplier-editor" ref={root}><strong>Xóa nhà cung cấp: {supplier.name}</strong><p>Chỉ xóa được nhà cung cấp chưa có phiếu nhập. Nhà cung cấp sẽ bị gỡ khỏi danh sách chọn.</p><CommandForm action="supplier_delete" label="Xác nhận xóa nhà cung cấp" submitDisabled={!confirmed} build={()=>({supplierId:supplier.id,version:supplier.details_version||1})} onSuccess={onDeleted}><label className="live-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Tôi xác nhận xóa nhà cung cấp này.</label><button className="button" type="button" onClick={()=>setDeleting(false)}>Quay lại</button></CommandForm></div>;
 return <div className="purchase-supplier-editor" ref={root}><strong>Sửa nhà cung cấp</strong><CommandForm action="supplier_details" label="Lưu thay đổi" preventEnter successText="Đã cập nhật nhà cung cấp." submitDisabled={!name.trim()||(name===supplier.name&&phone===supplier.phone)} build={()=>({supplierId:supplier.id,version:supplier.details_version||1,name,phone})} onSuccess={result=>{if(result.supplierDetails)onSaved(result.supplierDetails);}}>
  <div className="intake-fields"><label className="field">Tên nhà cung cấp<input value={name} onCompositionEnd={e=>setName(capitalizeWords(e.currentTarget.value))} onChange={e=>setName((e.nativeEvent as InputEvent).isComposing?e.target.value:capitalizeWords(e.target.value))} maxLength={180} required/></label><label className="field">Số điện thoại (nếu có)<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30}/></label></div>
  <button className="button" type="button" onClick={onCancel}>Hủy / Đóng</button>
 <button className="button" type="button" onClick={()=>setDeleting(true)}>Xóa nhà cung cấp</button></CommandForm></div>;
}
