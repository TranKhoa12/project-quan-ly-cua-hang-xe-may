import type { SaleRow } from './types';
export type PosLine={partId:string;quantity:number;cost:number};
export type PosDraft={lines:PosLine[];customer:string;method:'cash'|'transfer';cashReceived:string;reference?:string};
export type SavedDraft={revision:number;status:'editing'|'pending'|'completed';request_id:string|null;body:Record<string,unknown>&{draft?:PosDraft;command?:Record<string,unknown>;receipt?:SaleRow}};
export const emptyPosDraft=():PosDraft=>({lines:[],customer:'',method:'cash',cashReceived:''});
