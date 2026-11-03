'use client';
import {useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {garageCommand} from './actions';
type Payload=Record<string,unknown>;
export function CommandForm({action,build,children,label,onSuccess,reset=false,submitDisabled=false,successText='Đã lưu thành công.',preventEnter=false,submitPanel}:{action:string;build:(f:FormData)=>Payload;children:ReactNode;label:string;onSuccess?:(result:NonNullable<Awaited<ReturnType<typeof garageCommand>>['result']>)=>void;reset?:boolean;submitDisabled?:boolean;successText?:string;preventEnter?:boolean;submitPanel?:ReactNode}) {
 const router=useRouter();const ref=useRef<HTMLFormElement>(null);
 const request=useRef<{key:string;json:string;payload:Payload}|null>(null);
 const sending=useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[uncertain,setUncertain]=useState(false);
 async function send(payload:Payload){
  if(sending.current)return;
  sending.current=true;
  const json=JSON.stringify(payload);
  if(!request.current||request.current.json!==json)request.current={key:crypto.randomUUID(),json,payload};
  setBusy(true);setError('');setSuccess('');
  try{
   const result=await garageCommand(action,payload,request.current.key);
   if(result.error){setError(result.error);setUncertain(!!result.uncertain);return;}
   if(!result.result){setError('Chưa xác nhận kết quả. Hãy kiểm tra lại cùng yêu cầu.');setUncertain(true);return;}
   request.current=null;setUncertain(false);setSuccess(successText);if(reset)ref.current?.reset();
   onSuccess?.(result.result);router.refresh();
   if(action==='settings')window.dispatchEvent(new Event('shop-settings-updated'));
  }catch{setError('Chưa xác nhận kết quả. Thử lại cùng yêu cầu bên dưới.');setUncertain(true);}
  finally{sending.current=false;setBusy(false);}
 }
 return <form ref={ref} aria-busy={busy} className="live-form" onKeyDown={e=>{if(preventEnter&&e.key==='Enter'&&e.target instanceof HTMLInputElement)e.preventDefault();}} onSubmit={e=>{e.preventDefault();void send(build(new FormData(e.currentTarget)));}}>
  <fieldset disabled={busy||uncertain}>{children}{submitPanel?<aside className="command-submit-panel">{submitPanel}<button className="button primary" type="submit" disabled={submitDisabled}>{busy?'Đang lưu…':label}</button></aside>:<button className="button primary" type="submit" disabled={submitDisabled}>{busy?'Đang lưu…':label}</button>}</fieldset>
  {error&&<p className="auth-error" role="alert">{error}</p>}{success&&<p className="auth-success" role="status">{success}</p>}
  {uncertain&&<button className="button" type="button" disabled={busy} onClick={()=>request.current&&void send(request.current.payload)}>Kiểm tra lại cùng yêu cầu</button>}
 </form>;
}
