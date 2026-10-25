'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, LogIn, Wrench } from 'lucide-react';
import { loginAction, changePasswordAction } from '@/app/auth-actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  const [visible, setVisible] = useState(false);
  return <div className="auth-page"><div className="auth-intro"><span className="auth-logo"><Wrench size={26}/> MotoCare</span><div><span className="auth-kicker">KHÔNG GIAN LÀM VIỆC CỦA CỬA HÀNG</span><h1>Chăm xe tận tâm.<br/>Quản lý nhẹ nhàng.</h1><p>Đăng nhập để bắt đầu công việc, theo dõi sửa chữa và chăm sóc khách hàng.</p></div><small>Quản lý · Bán hàng · Sửa chữa</small></div><div className="auth-form-region"><div className="auth-form-card"><span className="auth-lock"><LockKeyhole size={25}/></span><h2>Chào mừng trở lại</h2><p>Sử dụng tài khoản do quản lý cửa hàng cấp.</p><form action={action}><label className="field">Tên đăng nhập<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} placeholder="Ví dụ: quanly"/></label><label className="field">Mật khẩu<div className="password-input"><input name="password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={128}/><button type="button" aria-label={visible?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>{state.error&&<p className="auth-error" role="alert">{state.error}</p>}<button className="button primary full auth-submit" disabled={pending}><LogIn size={18}/>{pending?'Đang đăng nhập...':'Đăng nhập'}</button></form><p className="auth-help">Chưa có tài khoản hoặc quên mật khẩu?<br/>Liên hệ quản lý cửa hàng để được cấp lại.</p></div><small className="auth-footer">Kết nối bảo mật với Supabase Auth</small></div></div>;
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return <form action={action} className="password-form"><label className="field">Mật khẩu hiện tại<input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128}/></label><label className="field">Mật khẩu mới<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><label className="field">Nhập lại mật khẩu mới<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><p className="form-hint">Từ 12 đến 128 ký tự, gồm chữ và số.</p>{state.error&&<p role="alert" className="auth-error">{state.error}</p>}{state.success&&<p role="status" className="auth-success">{state.success}</p>}<button className="button primary" disabled={pending}>{pending?'Đang cập nhật...':'Đổi mật khẩu'}</button></form>;
}
