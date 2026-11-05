'use client';
import {useState,type ReactNode} from 'react';
export default function ProductImage({src,name,fallback}:{src?:string|null;name:string;fallback:ReactNode}){
 const [failed,setFailed]=useState(false);
 return src&&!failed?<img key={src} className="part-product-image" src={src} alt={`Ảnh ${name}`} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<>{fallback}</>;
}
