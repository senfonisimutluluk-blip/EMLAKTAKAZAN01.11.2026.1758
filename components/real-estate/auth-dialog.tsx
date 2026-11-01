'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type AccountRole = 'agent' | 'visitor';
type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

const headings: Record<AuthMode, { title: string; subtitle: string; action: string }> = {
  login: { title: 'Tekrar hoş geldin.', subtitle: 'Favorilerine ve takip listene kaldığın yerden devam et.', action: 'Giriş yap' },
  signup: { title: 'Sen de katıl.', subtitle: 'Sana uygun hesabı seçerek EMLAKTAKAZAN dünyasına katıl.', action: 'Hesap oluştur' },
  forgot: { title: 'Şifreni sıfırla.', subtitle: 'E-posta adresini gir, şifreni değiştirmen için sana bir bağlantı gönderelim.', action: 'Sıfırlama bağlantısı gönder' },
  reset: { title: 'Yeni şifreni belirle.', subtitle: 'E-postadaki bağlantıyla doğrulandı. Hesabın için yeni bir şifre seç.', action: 'Şifreyi kaydet' },
};

export function AuthDialog({ onClose, initialMode = 'login' }: { onClose: () => void; initialMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AccountRole>('visitor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setMessage(error ? 'Bağlantı gönderilemedi. Lütfen birkaç dakika sonra tekrar deneyin.' : 'E-posta adresin kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');
      setBusy(false);
      return;
    }

    if (mode === 'reset') {
      if (password !== confirmPassword) {
        setMessage('Girdiğin şifreler eşleşmiyor.');
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setMessage('Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir, şifre sıfırlamayı yeniden başlat.');
      else onClose();
      setBusy(false);
      return;
    }

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName, role } } });
    if (result.error) {
      setMessage('Bilgileri kontrol edip tekrar deneyin.');
    } else if (mode === 'signup' && !result.data.session) {
      setMessage('Kaydınız oluşturuldu. E-posta doğrulaması gerekiyorsa gelen kutunuzu kontrol edin.');
    } else {
      let profileError = false;
      if (mode === 'signup' && result.data.user) {
        const { error } = await supabase.from('profiles').upsert({ id: result.data.user.id, display_name: displayName || result.data.user.email?.split('@')[0] || 'EMLAKTAKAZAN kullanıcısı', role });
        profileError = Boolean(error);
      }
      if (profileError) setMessage('Hesap oluşturuldu ancak profil hazırlanamadı.');
      else onClose();
    }
    setBusy(false);
  }

  const showTabs = mode === 'login' || mode === 'signup';
  const showEmail = mode !== 'reset';
  const showPasswordField = mode !== 'forgot';
  const inputClass = 'w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6f6e7b]';
  const fieldClass = 'mt-2 flex items-center gap-3 border-b border-white/15 py-3 transition focus-within:border-[#f43f68]';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#08080d]/80 p-4 backdrop-blur-md sm:p-6">
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#14141d] text-white shadow-[0_30px_100px_rgba(0,0,0,.55)] lg:grid-cols-[.9fr_1.1fr]">
        <button onClick={onClose} className="absolute right-5 top-5 z-20 rounded-full border border-white/15 bg-black/20 p-2 text-[#c2c1cc] transition hover:border-[#f43f68] hover:text-white" aria-label="Kapat"><X size={17} /></button>

        <div className="relative hidden min-h-[620px] overflow-hidden bg-[#0e0e15] p-10 lg:block">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#f43f68]/25 blur-3xl" />
          <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#ffb21a]/20 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Image src="/logo.jpg" alt="EMLAKTAKAZAN" width={54} height={54} className="rounded-2xl object-cover ring-2 ring-[#ffb21a]/60" />
                <div>
                  <p className="text-lg font-black tracking-[.12em] text-[#ffb21a]">EMLAKTAKAZAN</p>
                  <p className="text-xs italic text-[#ffb21a]">kazandırır...</p>
                </div>
              </div>
              <div className="mt-24">
                <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-[#ff9ab0]">Doğru yere hoş geldin</p>
                <h2 className="max-w-sm text-5xl font-black leading-[1.02] tracking-[-.04em]">Hayalindeki yeri birlikte bulalım.</h2>
                <p className="mt-6 max-w-sm text-sm leading-7 text-[#aaa9b6]">Güvenilir portföyleri keşfet, favorilerini kaydet ve doğru kişilerle bağlantı kur.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Building2 size={18} className="text-[#ffb21a]" /><strong className="mt-3 block text-xl">Seçili</strong><span className="text-xs text-[#aaa9b6]">Portföyler</span></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><UserRound size={18} className="text-[#f43f68]" /><strong className="mt-3 block text-xl">Gerçek</strong><span className="text-xs text-[#aaa9b6]">Kullanıcılar</span></div>
            </div>
          </div>
        </div>

        <div className="p-7 sm:p-10 lg:p-14">
          <div className="mb-8 pr-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#ffb21a]">Hesabına devam et</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{headings[mode].title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#aaa9b6]">{headings[mode].subtitle}</p>
          </div>

          {showTabs && (
            <div className="mb-8 flex gap-6 border-b border-white/10">
              <button onClick={() => switchMode('login')} className={`relative pb-3 text-sm font-bold transition ${mode === 'login' ? 'text-white' : 'text-[#777687]'}`}>Giriş yap{mode === 'login' && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[#f43f68]" />}</button>
              <button onClick={() => switchMode('signup')} className={`relative pb-3 text-sm font-bold transition ${mode === 'signup' ? 'text-white' : 'text-[#777687]'}`}>Kayıt ol{mode === 'signup' && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[#f43f68]" />}</button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {mode === 'signup' && (
              <>
                <label className="block text-xs font-semibold text-[#aaa9b6]">
                  Ad soyad veya ofis adı
                  <div className={fieldClass}>
                    <UserRound size={18} className="text-[#ffb21a]" />
                    <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required className={inputClass} placeholder="Örn. Derya Aksoy" />
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRole('visitor')} className={`rounded-2xl border p-4 text-left transition ${role === 'visitor' ? 'border-[#f43f68] bg-[#f43f68]/10' : 'border-white/10 bg-white/[.02] hover:border-white/25'}`}>
                    <UserRound size={18} className={role === 'visitor' ? 'text-[#ff9ab0]' : 'text-[#aaa9b6]'} />
                    <strong className="mt-3 block text-sm">Ziyaretçi</strong>
                    <span className="mt-1 block text-xs text-[#aaa9b6]">Keşfet ve kaydet</span>
                  </button>
                  <button type="button" onClick={() => setRole('agent')} className={`rounded-2xl border p-4 text-left transition ${role === 'agent' ? 'border-[#f43f68] bg-[#f43f68]/10' : 'border-white/10 bg-white/[.02] hover:border-white/25'}`}>
                    <Building2 size={18} className={role === 'agent' ? 'text-[#ff9ab0]' : 'text-[#aaa9b6]'} />
                    <strong className="mt-3 block text-sm">Emlakçı</strong>
                    <span className="mt-1 block text-xs text-[#aaa9b6]">Portföyünü yönet</span>
                  </button>
                </div>
              </>
            )}

            {showEmail && (
              <label className="block text-xs font-semibold text-[#aaa9b6]">
                E-posta adresi
                <div className={fieldClass}>
                  <Mail size={18} className="text-[#ffb21a]" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" className={inputClass} placeholder="ornek@mail.com" />
                </div>
              </label>
            )}

            {showPasswordField && (
              <label className="block text-xs font-semibold text-[#aaa9b6]">
                {mode === 'reset' ? 'Yeni şifre' : 'Şifre'}
                <div className={`relative ${fieldClass}`}>
                  <LockKeyhole size={18} className="text-[#ffb21a]" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} type={showPassword ? 'text' : 'password'} className={`${inputClass} pr-8`} placeholder="En az 6 karakter" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 text-[#aaa9b6]" aria-label="Şifreyi göster">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
              </label>
            )}

            {mode === 'login' && (
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-[#ffb21a] transition hover:text-white">Şifremi unuttum</button>
              </div>
            )}

            {mode === 'reset' && (
              <label className="block text-xs font-semibold text-[#aaa9b6]">
                Yeni şifre (tekrar)
                <div className={fieldClass}>
                  <LockKeyhole size={18} className="text-[#ffb21a]" />
                  <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={6} type={showPassword ? 'text' : 'password'} className={inputClass} placeholder="Şifreni tekrar gir" />
                </div>
              </label>
            )}

            {message && <p className="rounded-2xl border border-[#f43f68]/30 bg-[#f43f68]/10 px-4 py-3 text-xs leading-5 text-[#ffb5c5]">{message}</p>}

            <button disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f43f68] py-4 text-sm font-bold text-white shadow-lg shadow-[#f43f68]/20 transition hover:bg-[#d82e57] disabled:opacity-60">
              {busy ? 'İşleniyor...' : headings[mode].action}
              {mode === 'signup' ? <Check size={17} /> : <ArrowRight size={17} className="transition group-hover:translate-x-1" />}
            </button>
          </form>

          {mode === 'forgot' && (
            <button type="button" onClick={() => switchMode('login')} className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#aaa9b6] transition hover:text-white">
              <ArrowLeft size={14} /> Girişe dön
            </button>
          )}

          <p className="mt-7 text-center text-xs text-[#777687]">Devam ederek EMLAKTAKAZAN kullanım koşullarını kabul etmiş olursun.</p>
        </div>
      </div>
    </div>
  );
}
