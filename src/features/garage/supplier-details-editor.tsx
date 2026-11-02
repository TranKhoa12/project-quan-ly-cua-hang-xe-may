'use client';
import {useEffect,useRef,useState} from 'react';
import {CommandForm} from './command-form';
import type {SupplierRow} from './types';

export default function SupplierDetailsEditor({supplier,onSaved,onCancel}:{supplier:SupplierRow;onSaved:(supplier:SupplierRow)=>void;onCancel:()=>void}){
 const [name,setName]=useState(supplier.name),[phone,setPhone]=useState(supplier.phone);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{root.current?.querySelector<HTMLInputElement>('input')?.focus();root.current?.scrollIntoView({block:'nearest'});},[]);
 return <div className="purchase-supplier-editor" ref={root}><strong>Sửa nhà cung cấp</strong><CommandForm action="supplier_details" label="Lưu thay đổi" preventEnter successText="Đã cập nhật nhà cung cấp." submitDisabled={!name.trim()||(name===supplier.name&&phone===supplier.phone)} build={()=>({supplierId:supplier.id,version:supplier.details_version||1,name,phone})} onSuccess={result=>{if(result.supplierDetails)onSaved(result.supplierDetails);}}>
  <div className="intake-fields"><label className="field">Tên nhà cung cấp<input value={name} onChange={e=>setName(e.target.value)} maxLength={180} required/></label><label className="field">Số điện thoại (nếu có)<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30}/></label></div>
  <button className="button" type="button" onClick={onCancel}>Hủy / Đóng</button>
 </CommandForm></div>;
}
