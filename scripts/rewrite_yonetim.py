import sys

with open('c:/dev/kulup/app/(yonetim)/yonetim/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 0-640 (up to and including the opening div line)
kept = ''.join(lines[:641])

new_jsx = r"""
      {/* SIDEBAR */}
      <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#0c1526', borderRight: '1px solid #1e2d45', zIndex: 20 }}>
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid #1e2d45' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Eye size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>Klüp360</div>
              <div style={{ fontSize: 9, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {navItems.map(({ id, label, Icon, badge }: any) => {
            const active = sekme === id
            return (
              <button key={id} onClick={() => setSekme(id as any)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: active ? 'rgba(59,130,246,0.14)' : 'transparent',
                color: active ? '#60a5fa' : '#64748b', fontSize: 13, fontWeight: active ? 700 : 400,
                transition: 'all 0.12s',
              }}>
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 9999, fontSize: 9, fontWeight: 800, padding: '1px 5px' }}>{badge}</span>}
                {active && <div style={{ width: 2, height: 14, background: '#3b82f6', borderRadius: 99, flexShrink: 0 }} />}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '10px', borderTop: '1px solid #1e2d45' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 7, marginBottom: 6, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>S</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>Super Admin</div>
              <div style={{ fontSize: 9, color: '#475569' }}>Yönetici</div>
            </div>
          </div>
          <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            <Key size={11} /> Güvenli Çıkış
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{ height: 52, flexShrink: 0, background: '#0c1526', borderBottom: '1px solid #1e2d45', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9', flex: 1 }}>
            {({ ozet:'Genel Bakış', kullanicilar:'Kurumlar', analiz:'Kullanım Analizi', odemeler:'Ödemeler', duyurular:'Duyurular', iller:'İller & Bölgeler', denetim:'Denetim', loglar:'Denetim İzleri', ayarlar:'Sistem Ayarları' } as any)[sekme]}
          </h1>
          {bakimAktif && <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:20, padding:'2px 10px' }}><div style={{ width:5, height:5, borderRadius:'50%', background:'#ef4444' }} /><span style={{ fontSize:10, fontWeight:800, color:'#f87171', textTransform:'uppercase' }}>Bakım Aktif</span></div>}
          {sekme === 'ozet' && <button onClick={handleBakimToggle} disabled={bakimGuncelleniyor} style={{ ...S.btn(bakimAktif ? '#ef4444' : 'rgba(255,255,255,0.07)', bakimAktif ? '#fff' : '#94a3b8') }}><Activity size={13} />{bakimAktif ? 'Bakımı Kapat' : 'Bakım Başlat'}</button>}
          {sekme === 'odemeler' && <button onClick={() => setShowOdemeModal(true)} style={S.btn('#16a34a')}><CreditCard size={13} /> Ödeme Ekle</button>}
          {sekme === 'duyurular' && <button onClick={() => setShowDuyuruModal(true)} style={S.btn('#3b82f6')}><Megaphone size={13} /> Yeni Duyuru</button>}
          {sekme === 'loglar' && <button onClick={loglariGetir} disabled={logYukleniyor} style={S.btn('rgba(255,255,255,0.07)', '#94a3b8')}><RefreshCw size={13} /></button>}
        </header>

        {(hata || basari) && (
          <div style={{ padding: '10px 24px 0', display:'flex', flexDirection:'column', gap:6 }}>
            {hata && <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'9px 14px', fontSize:13, color:'#fca5a5', display:'flex', justifyContent:'space-between', alignItems:'center' }}><span>{hata}</span><button onClick={() => setHata(null)} style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:15, lineHeight:1, padding:0 }}>×</button></div>}
            {basari && <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:8, padding:'9px 14px', fontSize:13, color:'#86efac', display:'flex', justifyContent:'space-between', alignItems:'center' }}><span>{basari}</span><button onClick={() => setBasari(null)} style={{ background:'none', border:'none', color:'#4ade80', cursor:'pointer', fontSize:15, lineHeight:1, padding:0 }}>×</button></div>}
          </div>
        )}

        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>

          {sekme === 'ozet' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                {[
                  { label:'Toplam Kurum', val: toplamOkul, Icon: School, color:'#3b82f6', bg:'rgba(59,130,246,0.1)' },
                  { label:'Aktif Kurum', val: aktifOkul, Icon: Activity, color:'#22c55e', bg:'rgba(34,197,94,0.1)' },
                  { label:'Borçlu', val: borcluOkul, Icon: AlertTriangle, color:'#f59e0b', bg:'rgba(245,158,11,0.1)' },
                  { label:'Lisansı Dolmuş', val: suresiDolmus, Icon: XCircle, color:'#ef4444', bg:'rgba(239,68,68,0.1)' },
                ].map((s: any) => (
                  <div key={s.label} style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, padding:'18px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center' }}><s.Icon size={16} color={s.color} /></div>
                      <span style={{ fontSize:11, color:'#475569', fontWeight:600 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize:28, fontWeight:800, color:'#f1f5f9', lineHeight:1 }}>{yukleniyor ? '—' : s.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, padding:'18px 20px' }}>
                  <div style={{ fontSize:10, color:'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Toplam Gelir</div>
                  <div style={{ fontSize:24, fontWeight:800, color:'#facc15' }}>{new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(toplamGelir)}</div>
                </div>
                <div style={{ background: bakimAktif?'rgba(127,29,29,0.4)':'#111827', border: bakimAktif?'1px solid #991b1b':'1px solid #1e2d45', borderRadius:14, padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:10, color: bakimAktif?'#fca5a5':'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Bakım Modu</div>
                    <div style={{ fontSize:14, fontWeight:700, color: bakimAktif?'#f87171':'#4ade80' }}>{bakimAktif ? 'AKTİF' : 'PASİF'}</div>
                  </div>
                  <button onClick={handleBakimToggle} disabled={bakimGuncelleniyor} style={{ ...S.btn(bakimAktif ? '#ef4444' : '#334155') }}><Activity size={13} />{bakimAktif ? 'Kapat' : 'Başlat'}</button>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'3fr 1fr', gap:14, alignItems:'start' }}>
                <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                  <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e2d45', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>Kayıtlı Okullar {activeIlFilter ? `· ${iller.find(i=>i.id===activeIlFilter)?.ad}` : ''}</span>
                    <div style={{ display:'flex', gap:8 }}>
                      {activeIlFilter && <button onClick={() => setActiveIlFilter(null)} style={{ ...S.btn('rgba(239,68,68,0.1)', '#f87171') }}>Filtreyi Kaldır</button>}
                      <button onClick={listeyiGetir} disabled={yukleniyor} style={S.btn('rgba(59,130,246,0.08)', '#60a5fa')}><RefreshCw size={12} /></button>
                    </div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead><tr>{['Kurum','İl','Kapasite','Son Giriş','Durum'].map(h => <th key={h} style={{ padding:'11px 20px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {liste.filter(k => {
                          if(k.rol==='super_admin'||k.rol==='denetim_yetkilisi') return false
                          if(activeIlFilter) return okulIlMap[k.okullar?.id||0]===activeIlFilter
                          return true
                        }).slice(0, activeIlFilter ? 100 : 12).map(k => (
                          <tr key={k.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ fontWeight:600, color:'#f1f5f9' }}>{k.okullar?.ad||'—'}</div><div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{k.email}</div></td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:'rgba(59,130,246,0.1)', color:'#60a5fa' }}>{iller.find(i=>i.id===okulIlMap[k.okullar?.id||0])?.ad||'—'}</span></td>
                            <td style={{ padding:'13px 20px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.okullar?.ogrenci_sayisi||0} öğ / {k.okullar?.personel_sayisi||0} per</td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{formatLastLogin(k.last_login)}</td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ width:8, height:8, borderRadius:'50%', background: k.banned?'#ef4444':'#22c55e' }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e2d45', display:'flex', alignItems:'center', gap:8 }}>
                      <MapPin size={14} color="#a78bfa" /><span style={{ fontWeight:700, fontSize:13 }}>Denetim Hubları</span>
                    </div>
                    <div style={{ padding:'10px 8px' }}>
                      <div style={{ position:'relative', marginBottom:8 }}>
                        <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#475569', pointerEvents:'none' }} />
                        <input placeholder="İl ara..." value={ilFilterSearch} onChange={e=>setIlFilterSearch(e.target.value)} style={{ width:'100%', height:34, padding:'0 12px 0 28px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:12, outline:'none', boxSizing:'border-box' }} />
                      </div>
                      <div style={{ maxHeight:220, overflowY:'auto' }}>
                        {iller.filter(il=>il.ad.toLocaleLowerCase('tr').includes(ilFilterSearch.toLocaleLowerCase('tr'))).slice(0,ilFilterSearch?15:6).map(il=>(
                          <div key={il.id} onClick={() => { setActiveIlFilter(il.id===activeIlFilter?null:il.id); setIlFilterSearch('') }} style={{ padding:'8px 10px', borderRadius:6, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background: il.id===activeIlFilter?'rgba(59,130,246,0.12)':'transparent', marginBottom:1 }} onMouseEnter={e=>{if(il.id!==activeIlFilter)(e.target as any).parentElement.style.background='rgba(255,255,255,0.04)'}} onMouseLeave={e=>{if(il.id!==activeIlFilter)(e.target as any).parentElement.style.background='transparent'}}>
                            <span style={{ fontSize:12, fontWeight:600, color: il.id===activeIlFilter?'#60a5fa':'#cbd5e1' }}>{il.ad}</span>
                            <span style={{ fontSize:10, color:'#475569' }}>{(il.okullar||[]).length}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setSekme('iller')} style={{ width:'100%', marginTop:8, padding:'7px', borderRadius:6, border:'none', background:'transparent', color:'#60a5fa', fontSize:11, fontWeight:700, cursor:'pointer' }}>Tüm İlleri Yönet →</button>
                    </div>
                  </div>
                  <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:14, padding:'14px 16px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#60a5fa', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}><TrendingUp size={12} /> Öngörü</div>
                    <p style={{ fontSize:11, color:'#64748b', lineHeight:1.6, margin:0 }}>30 gün içinde lisansı dolacak {yaklasanTahsilatOkullari.length} kurum var.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {sekme === 'kullanicilar' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #1e2d45' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:2 }}>Yeni Hesap Oluştur</div>
                  <p style={{ margin:0, fontSize:11, color:'#475569' }}>Yeni okul veya bölge yetkilisi tanımlayın.</p>
                </div>
                <div style={{ padding:'16px 20px' }}>
                  <form onSubmit={handleOlustur}>
                    <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
                      <div>
                        <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Rol</label>
                        <select value={formRol} onChange={e=>setFormRol(e.target.value as any)} style={{ height:40, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none' }}>
                          <option value="okul_admin">Okul Admin</option>
                          <option value="denetim_yetkilisi">Bölge Yetkilisi</option>
                        </select>
                      </div>
                      {formRol === 'okul_admin' && <div style={{ flex:1, minWidth:160 }}><label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Kurum Adı</label><input required style={{ width:'100%', height:40, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }} value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Örn: Sivas Kulübü" /></div>}
                      <div style={{ flex:1, minWidth:160 }}><label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>E-posta</label><input required type="email" style={{ width:'100%', height:40, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }} value={email} onChange={e=>setEmail(e.target.value)} /></div>
                      <div style={{ flex:1, minWidth:140 }}><label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Şifre</label><input required type="password" style={{ width:'100%', height:40, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 karakter" /></div>
                      <div style={{ flex:1, minWidth:140 }}>
                        <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Bölge</label>
                        <select required value={formIlId||''} onChange={e=>setFormIlId(Number(e.target.value))} style={{ width:'100%', height:40, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }}>
                          <option value="">Seçiniz...</option>
                          {iller.map(il=><option key={il.id} value={il.id}>{il.ad}</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={olusturuluyor} style={{ display:'flex', alignItems:'center', gap:7, padding:'0 16px', height:40, borderRadius:8, border:'none', background:'#3b82f6', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}><UserPlus size={14} />{olusturuluyor?'...':'Oluştur'}</button>
                    </div>
                  </form>
                </div>
              </div>

              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'12px 20px', borderBottom:'1px solid #1e2d45', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ display:'flex', background:'#0a1628', borderRadius:8, padding:3, gap:2 }}>
                    {([['okullar','Kurum Portföyü',School],['yetkililer','Bölge Yetkilileri',ShieldCheck],['talepler','Aktivasyon Talepleri',Mail]] as any[]).map(([id,label,Icon])=>(
                      <button key={id} onClick={()=>setKisiSekme(id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:kisiSekme===id?'rgba(59,130,246,0.15)':'transparent', color:kisiSekme===id?'#60a5fa':'#475569', transition:'all 0.15s' }}>
                        <Icon size={12} />{label}
                        {id==='talepler' && denetciTalepleri.filter((t:any)=>t.status==='beklemede').length > 0 && <span style={{ background:'#ef4444', color:'#fff', borderRadius:9999, fontSize:9, fontWeight:800, padding:'1px 5px' }}>{denetciTalepleri.filter((t:any)=>t.status==='beklemede').length}</span>}
                      </button>
                    ))}
                  </div>
                  <div style={{ position:'relative' }}>
                    <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#475569', pointerEvents:'none' }} />
                    <input placeholder="Ara..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:200, height:34, padding:'0 12px 0 28px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none' }} />
                  </div>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>
                      {kisiSekme==='okullar' ? ['Kurum','İl','E-posta','Son Giriş','Lisans','İşlemler'].map(h=><th key={h} style={{ padding:'11px 16px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:h==='İşlemler'?'right':'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}>{h}</th>)
                      : kisiSekme==='yetkililer' ? ['Bölge','E-posta','Son Giriş','İşlemler'].map(h=><th key={h} style={{ padding:'11px 16px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:h==='İşlemler'?'right':'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}>{h}</th>)
                      : ['Okul / Talep Eden','İletişim','Tarih','Durum','Karar'].map(h=><th key={h} style={{ padding:'11px 16px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:h==='Karar'?'right':'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(kisiSekme==='okullar'
                        ? filtrelenmisListe.filter(k=>k.rol!=='denetim_yetkilisi')
                        : kisiSekme==='yetkililer'
                          ? denetimListe.filter((d:any)=>d.email?.toLowerCase().includes(search.toLowerCase()))
                          : denetciTalepleri.filter((t:any)=>t.ad_soyad?.toLowerCase().includes(search.toLowerCase())||t.okullar?.ad?.toLowerCase().includes(search.toLowerCase()))
                      ).map((k:any) => (
                        <tr key={k.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          {kisiSekme==='okullar' ? (<>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ fontWeight:600, color:'#f1f5f9' }}>{k.okullar?.ad||'—'}{k.rol==='super_admin'&&<span style={{ fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:4, background:'rgba(59,130,246,0.1)', color:'#93c5fd', marginLeft:6 }}>BOSS</span>}</div></td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:'rgba(59,130,246,0.1)', color:'#60a5fa' }}>{iller.find(i=>i.id===okulIlMap[k.okullar?.id||0])?.ad||'—'}</span></td>
                            <td style={{ padding:'12px 16px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.email}</td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{formatLastLogin(k.last_login)}</td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                                <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:k.okullar?.odeme_durumu==='borclu'?'rgba(251,146,60,0.1)':k.okullar?.odeme_durumu==='kapali'?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)', color:k.okullar?.odeme_durumu==='borclu'?'#fb923c':k.okullar?.odeme_durumu==='kapali'?'#f87171':'#4ade80', width:'fit-content' }}>{(k.okullar?.odeme_durumu||'—').toUpperCase()}</span>
                                {k.okullar?.lisans_bitis&&<span style={{ fontSize:10, color:isExpired(k.okullar.lisans_bitis)?'#f87171':'#475569' }}>SKT: {new Date(k.okullar.lisans_bitis).toLocaleDateString('tr-TR')}</span>}
                              </div>
                            </td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right' }}>
                              <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                                <button onClick={() => handleHizliAktivasyon(k,'aylik')} style={actionBtnStyle} title="+1 Ay"><Zap size={13} color="#4ade80" /></button>
                                <button onClick={() => handleHizliAktivasyon(k,'yillik')} style={actionBtnStyle} title="+1 Yıl"><Star size={13} color="#facc15" /></button>
                                <button onClick={() => { setSelectedOkul(k); setLisansTarihi(k.okullar?.lisans_bitis?.split('T')[0]||''); setOdemeDurumu(k.okullar?.odeme_durumu||'aktif') }} style={actionBtnStyle} title="Lisans"><CreditCard size={13} /></button>
                                <button onClick={() => setSelectedUser(k)} style={actionBtnStyle} title="Şifre"><Lock size={13} /></button>
                                <button onClick={() => handleToggleBan(k)} style={{ ...actionBtnStyle, color: k.banned?'#4ade80':'#94a3b8' }} title={k.banned?'Aktif Et':'Askıya Al'}>{k.banned?<CheckCircle size={13}/>:<AlertTriangle size={13}/>}</button>
                                {silConfirm===k.id ? <button onClick={() => handleSil(k.id)} style={{ padding:'4px 10px', background:'#ef4444', border:'none', borderRadius:6, color:'white', fontSize:10, fontWeight:800, cursor:'pointer' }}>Sil?</button> : <button onClick={() => setSilConfirm(k.id)} style={{ ...actionBtnStyle, color:'#f87171' }} title="Sil"><Trash2 size={13} /></button>}
                              </div>
                            </td>
                          </>) : kisiSekme==='yetkililer' ? (<>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#f1f5f9', fontWeight:600, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{(k as any).iller?.ad||'Atanmamış'}</td>
                            <td style={{ padding:'12px 16px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.email}</td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{formatLastLogin(k.son_giris)}</td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right' }}><div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                              <button onClick={() => setSelectedUser(k)} style={actionBtnStyle} title="Şifre"><Lock size={13} /></button>
                              <button onClick={() => setSilConfirm(k.id)} style={{ ...actionBtnStyle, color:'#f87171' }} title="Sil"><Trash2 size={13} /></button>
                            </div></td>
                          </>) : (<>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ fontWeight:600, color:'#f1f5f9' }}>{k.ad_soyad}</div><div style={{ fontSize:11, color:'#475569' }}>{k.okullar?.ad}</div></td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ fontSize:12, color:'#94a3b8' }}>{k.email}</div><div style={{ fontSize:11, color:'#475569' }}>{k.telefon}</div></td>
                            <td style={{ padding:'12px 16px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{new Date(k.created_at).toLocaleDateString('tr-TR')}</td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:k.status==='beklemede'?'rgba(251,146,60,0.1)':k.status==='onaylandi'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)', color:k.status==='beklemede'?'#fb923c':k.status==='onaylandi'?'#4ade80':'#f87171' }}>{k.status.toUpperCase()}</span></td>
                            <td style={{ padding:'12px 16px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right' }}>{k.status==='beklemede'?<div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                              <button onClick={() => handleTalepIslem(k.id,'reddedildi')} disabled={onaylaniyorId===k.id} style={{ ...actionBtnStyle, color:'#f87171' }} title="Reddet"><XCircle size={13} /></button>
                              <button onClick={() => handleTalepIslem(k.id,'onaylandi')} disabled={onaylaniyorId===k.id} style={{ ...actionBtnStyle, color:'#4ade80', background:'rgba(34,197,94,0.1)' }} title="Onayla"><CheckCircle size={13} /></button>
                            </div>:'—'}</td>
                          </>)}
                        </tr>
                      ))}
                      {(kisiSekme==='okullar'?filtrelenmisListe.filter(k=>k.rol!=='denetim_yetkilisi'):kisiSekme==='yetkililer'?denetimListe:denetciTalepleri).length===0&&(
                        <tr><td colSpan={6} style={{ padding:'32px', textAlign:'center', color:'#334155', fontSize:13 }}>Kayıt bulunamadı.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {sekme === 'analiz' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
                {[
                  { label:'Toplam Öğrenci', val: liste.reduce((a:number,c:any)=>a+(c.okullar?.ogrenci_sayisi||0),0), color:'#60a5fa' },
                  { label:'Toplam Personel', val: liste.reduce((a:number,c:any)=>a+(c.okullar?.personel_sayisi||0),0), color:'#a78bfa' },
                  { label:'Oluşturulan Bordro', val: liste.reduce((a:number,c:any)=>a+(c.okullar?.bordro_sayisi||0),0), color:'#fbbf24' },
                ].map((s:any) => (
                  <div key={s.label} style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, padding:'18px 20px' }}>
                    <div style={{ fontSize:10, color:'#475569', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>{s.label}</div>
                    <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e2d45' }}><span style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>Kurumların Aktiflik Karnesi</span></div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>{['Kurum','Öğrenci','Personel','Bordro','Tahsilat','Skor'].map(h=><th key={h} style={{ padding:'11px 20px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {liste.filter((k:any)=>k.rol!=='super_admin').sort((a:any,b:any)=>(b.okullar?.ogrenci_sayisi||0)-(a.okullar?.ogrenci_sayisi||0)).map((k:any) => {
                        const score = (k.okullar?.ogrenci_sayisi||0)+(k.okullar?.bordro_sayisi||0)*2
                        return (
                          <tr key={k.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'13px 20px', fontWeight:600, color:'#f1f5f9', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.okullar?.ad}</td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.okullar?.ogrenci_sayisi||0}</td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.okullar?.personel_sayisi||0}</td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.okullar?.bordro_sayisi||0}</td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.okullar?.tahsilat_sayisi||0}</td>
                            <td style={{ padding:'13px 20px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:80, height:5, background:'#1e2d45', borderRadius:3, overflow:'hidden' }}>
                                  <div style={{ height:'100%', width:`${Math.min(score,100)}%`, background:score>50?'#22c55e':score>10?'#f59e0b':'#475569', borderRadius:3 }} />
                                </div>
                                <span style={{ fontSize:11, fontWeight:700 }}>{score}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {sekme === 'odemeler' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:10, color:'#475569', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Toplam Tahsilat</div>
                  <div style={{ fontSize:24, fontWeight:800, color:'#facc15' }}>{new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(toplamGelir)}</div>
                </div>
                <button onClick={() => { setShowOdemeModal(true); setSelectedOkulId(null) }} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:8, border:'none', background:'#16a34a', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}><CreditCard size={14} /> Yeni Ödeme</button>
              </div>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e2d45' }}><span style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>Son Ödemeler</span></div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>{['Tarih','Kurum','Tutar','Yöntem','Açıklama'].map(h=><th key={h} style={{ padding:'11px 20px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {odemeYukleniyor ? <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#334155' }}>Yükleniyor...</td></tr>
                      : odemeler.length===0 ? <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#334155' }}>Henüz ödeme kaydı yok.</td></tr>
                      : odemeler.map((o:any)=>(
                        <tr key={o.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{new Date(o.odeme_tarihi).toLocaleDateString('tr-TR')}</td>
                          <td style={{ padding:'12px 20px', fontSize:13, fontWeight:600, color:'#f1f5f9', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{o.okullar?.ad}</td>
                          <td style={{ padding:'12px 20px', fontSize:13, fontWeight:700, color:'#4ade80', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(o.tutar)}</td>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:'rgba(59,130,246,0.1)', color:'#60a5fa' }}>{o.odeme_yontemi.toUpperCase()}</span></td>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{o.aciklama||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {sekme === 'duyurular' && (
            <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Tarih','Tür','Başlık / İçerik','Durum','İşlem'].map(h=><th key={h} style={{ padding:'11px 20px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:h==='İşlem'?'right':'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {duyuruYukleniyor ? <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#334155' }}>Yükleniyor...</td></tr>
                    : duyurular.length===0 ? <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#334155' }}>Henüz duyuru yok.</td></tr>
                    : duyurular.map((d:any)=>(
                      <tr key={d.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'12px 20px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{new Date(d.created_at).toLocaleDateString('tr-TR')}</td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:d.tur==='danger'?'rgba(239,68,68,0.1)':d.tur==='warning'?'rgba(251,146,60,0.1)':'rgba(59,130,246,0.1)', color:d.tur==='danger'?'#f87171':d.tur==='warning'?'#fb923c':'#60a5fa' }}>{d.tur.toUpperCase()}</span></td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ fontWeight:600, color:'#f1f5f9' }}>{d.baslik}</div><div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{d.icerik.slice(0,60)}…</div></td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><button onClick={() => handleDuyuruToggle(d.id,!d.aktif)} style={{ fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:5, border:'none', cursor:'pointer', background:d.aktif?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.05)', color:d.aktif?'#4ade80':'#475569' }}>{d.aktif?'YAYINDA':'PASİF'}</button></td>
                        <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right' }}><button onClick={() => handleDuyuruSil(d.id)} style={actionBtnStyle}><Trash2 size={13} color="#f87171" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sekme === 'loglar' && (
            <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
              <div style={{ padding:'12px 20px', borderBottom:'1px solid #1e2d45', display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end' }}>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>İşlem</label>
                  <select value={islemFiltre} onChange={e=>setIslemFiltre(e.target.value)} style={{ height:38, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none' }}>
                    <option value="">Tümü</option>{Object.keys(ISLEM_RENK).map(k=><option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Okul</label>
                  <select value={okulFiltre} onChange={e=>setOkulFiltre(e.target.value)} style={{ height:38, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none' }}>
                    <option value="">Tüm Okullar</option>{okullar.map(o=><option key={o.id} value={o.id}>{o.ad}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Tarih','İşlem','Bölüm','Okul','IP','Açıklama'].map(h=><th key={h} style={{ padding:'11px 20px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {logYukleniyor ? <tr><td colSpan={6} style={{ padding:32, textAlign:'center', color:'#334155' }}>Yükleniyor...</td></tr>
                    : filtrelenmisLoglar.map((l:any) => {
                      const renk = ISLEM_RENK[l.islem]||{ bg:'#334155', color:'#94a3b8' }
                      const fail = l.islem==='login' && l.basarili===false
                      return (
                        <tr key={l.id} style={{ background: fail?'rgba(239,68,68,0.05)':'transparent' }} onMouseEnter={e=>e.currentTarget.style.background=fail?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background=fail?'rgba(239,68,68,0.05)':'transparent'}>
                          <td style={{ padding:'11px 20px', fontSize:11, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{tarihFmt(l.created_at)}</td>
                          <td style={{ padding:'11px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:fail?'#fecaca':renk.bg, color:fail?'#991b1b':renk.color }}>{l.islem.toUpperCase()}</span>{fail&&<span style={{ fontSize:9, color:'#ef4444', fontWeight:800, marginLeft:4 }}>HATALI</span>}</td>
                          <td style={{ padding:'11px 20px', fontSize:13, color:'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{TABLO_ETIKET[l.tablo]||l.tablo}</td>
                          <td style={{ padding:'11px 20px', fontSize:13, color:'#f1f5f9', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{(l as any).okullar?.ad||'—'}</td>
                          <td style={{ padding:'11px 20px', fontSize:11, color:'#64748b', fontFamily:'monospace', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{l.ip_adresi||'—'}</td>
                          <td style={{ padding:'11px 20px', fontSize:13, color:fail?'#fca5a5':'#94a3b8', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{l.aciklama}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sekme === 'iller' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, padding:'14px 20px', display:'flex', alignItems:'center', gap:12 }}>
                <MapPin size={16} color="#3b82f6" />
                <span style={{ fontSize:13, fontWeight:600, color:'#94a3b8' }}>Yeni İl:</span>
                <input style={{ flex:1, maxWidth:240, height:38, padding:'0 12px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none' }} placeholder="İl adı..." value={yeniIlAdi} onChange={e=>setYeniIlAdi(e.target.value)} onKeyDown={async e=>{ if(e.key!=='Enter'||!yeniIlAdi.trim()||ilEkleniyor) return; setIlEkleniyor(true); const res=await fetch('/api/admin/iller',{method:'POST',headers:apiHeaders(),body:JSON.stringify({ad:yeniIlAdi})}); if(res.ok){setYeniIlAdi('');illeriGetir()} else{const d=await res.json();setHata(d.error)} setIlEkleniyor(false)}} />
                <button disabled={ilEkleniyor||!yeniIlAdi.trim()} onClick={async()=>{ if(!yeniIlAdi.trim()||ilEkleniyor) return; setIlEkleniyor(true); const res=await fetch('/api/admin/iller',{method:'POST',headers:apiHeaders(),body:JSON.stringify({ad:yeniIlAdi})}); if(res.ok){setYeniIlAdi('');illeriGetir()} else{const d=await res.json();setHata(d.error)} setIlEkleniyor(false)}} style={{ display:'flex', alignItems:'center', gap:7, padding:'0 14px', height:38, borderRadius:8, border:'none', background:'#3b82f6', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Ekle</button>
              </div>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e2d45', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>Kurumları Bölgelere Ata</span>
                  <div style={{ position:'relative' }}>
                    <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#475569', pointerEvents:'none' }} />
                    <input placeholder="Kurum ara..." value={illerSearch} onChange={e=>setIllerSearch(e.target.value)} style={{ width:220, height:34, padding:'0 12px 0 28px', background:'#0a1628', border:'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none' }} />
                  </div>
                </div>
                <div style={{ padding:'14px 20px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8, maxHeight:300, overflowY:'auto' }}>
                    {liste.filter(k=>k.okullar&&k.okullar.ad?.toLowerCase().includes(illerSearch.toLowerCase())).map(k=>(
                      <div key={k.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.02)', borderRadius:8, border:'1px solid #1e2d45' }}>
                        <School size={13} color="#60a5fa" />
                        <span style={{ flex:1, fontSize:12, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k.okullar?.ad}</span>
                        <select style={{ background:'#0a1628', border:'1px solid #1e2d45', borderRadius:6, color:'#60a5fa', fontSize:11, fontWeight:700, padding:'4px 8px', cursor:'pointer', outline:'none' }} value={okulIlMap[k.okullar!.id]??''} onChange={async e=>{ const il_id=e.target.value?Number(e.target.value):null; setOkulIlMap(prev=>({...prev,[k.okullar!.id]:il_id})); await fetch('/api/admin/iller',{method:'PATCH',headers:apiHeaders(),body:JSON.stringify({okul_id:k.okullar!.id,il_id})}); illeriGetir() }}>
                          <option value="">Bölge Seç</option>{iller.map(il=><option key={il.id} value={il.id}>{il.ad}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#f1f5f9', marginBottom:12 }}>Mevcut Bölge Hubları ({iller.length})</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
                  {iller.map(il=>(
                    <div key={il.id} style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, padding:'16px 18px', transition:'transform 0.15s' }} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:28, height:28, background:'rgba(59,130,246,0.1)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}><Compass size={13} color="#3b82f6" /></div>
                          <div style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>{il.ad}</div>
                        </div>
                        <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:'rgba(59,130,246,0.1)', color:'#60a5fa' }}>{il.okullar?.length||0}</span>
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {il.okullar?.slice(0,5).map((o:any)=><span key={o.id} style={{ fontSize:9, fontWeight:700, color:'#64748b', background:'rgba(255,255,255,0.03)', padding:'2px 6px', borderRadius:4, border:'1px solid #1e2d45' }}>{o.ad.slice(0,18)}{o.ad.length>18?'…':''}</span>)}
                        {(il.okullar?.length||0)>5&&<span style={{ fontSize:9, color:'#475569', padding:'2px 4px' }}>+{il.okullar!.length-5} daha</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sekme === 'denetim' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e2d45' }}><span style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>Bölge Yetkilileri</span></div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>{['Bölge','E-posta','Son Giriş','İşlemler'].map(h=><th key={h} style={{ padding:'11px 20px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:h==='İşlemler'?'right':'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {denetimYukleniyor ? <tr><td colSpan={4} style={{ padding:28, textAlign:'center', color:'#334155' }}>Yükleniyor...</td></tr>
                      : denetimListe.length===0 ? <tr><td colSpan={4} style={{ padding:28, textAlign:'center', color:'#334155' }}>Henüz kayıtlı yetkili yok.</td></tr>
                      : denetimListe.map((k:any)=>(
                        <tr key={k.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'12px 20px', fontWeight:600, color:'#f1f5f9', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{(k as any).iller?.ad||'Atanmamış'}</td>
                          <td style={{ padding:'12px 20px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{k.email}</td>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{formatLastLogin(k.son_giris)}</td>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right' }}><div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                            <button onClick={() => setSelectedUser(k)} style={actionBtnStyle} title="Şifre Değiştir"><Lock size={13} /></button>
                            {denetimSilConfirm===k.id ? <button onClick={async()=>{ await fetch('/api/admin/denetim-kullanici',{method:'DELETE',headers:apiHeaders(),body:JSON.stringify({userId:k.id})}); setDenetimSilConfirm(null); denetimListesiGetir() }} style={{ padding:'4px 10px', background:'#ef4444', border:'none', borderRadius:6, color:'white', fontSize:10, fontWeight:800, cursor:'pointer' }}>Sil?</button> : <button onClick={()=>setDenetimSilConfirm(k.id)} style={{ ...actionBtnStyle, color:'#f87171' }}><Trash2 size={13} /></button>}
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ background:'#111827', border:'1px solid #1e2d45', borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #1e2d45', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:700, fontSize:13, color:'#f1f5f9' }}>Aktivasyon Talepleri</span>
                  {denetciTalepleri.filter((t:any)=>t.status==='beklemede').length>0&&<span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:'rgba(251,146,60,0.1)', color:'#fb923c' }}>{denetciTalepleri.filter((t:any)=>t.status==='beklemede').length} Bekliyor</span>}
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>{['Okul / Talep Eden','İletişim','Tarih','Durum','Karar'].map(h=><th key={h} style={{ padding:'11px 20px', color:'#475569', fontWeight:800, fontSize:10, textTransform:'uppercase', letterSpacing:0.8, textAlign:h==='Karar'?'right':'left', borderBottom:'1px solid #1e2d45', background:'rgba(0,0,0,0.2)' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {talepYukleniyor ? <tr><td colSpan={5} style={{ padding:28, textAlign:'center', color:'#334155' }}>Yükleniyor...</td></tr>
                      : denetciTalepleri.length===0 ? <tr><td colSpan={5} style={{ padding:28, textAlign:'center', color:'#334155' }}>Henüz aktivasyon talebi yok.</td></tr>
                      : denetciTalepleri.map((t:any)=>(
                        <tr key={t.id} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ fontWeight:600, color:'#f1f5f9' }}>{t.ad_soyad}</div><div style={{ fontSize:11, color:'#475569' }}>{t.okullar?.ad}</div></td>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><div style={{ fontSize:12, color:'#94a3b8' }}>{t.email}</div><div style={{ fontSize:11, color:'#475569' }}>{t.telefon}</div></td>
                          <td style={{ padding:'12px 20px', fontSize:12, color:'#64748b', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>{new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)' }}><span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:5, background:t.status==='beklemede'?'rgba(251,146,60,0.1)':t.status==='onaylandi'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)', color:t.status==='beklemede'?'#fb923c':t.status==='onaylandi'?'#4ade80':'#f87171' }}>{t.status.toUpperCase()}</span></td>
                          <td style={{ padding:'12px 20px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', textAlign:'right' }}>{t.status==='beklemede'?<div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                            <button onClick={()=>handleTalepIslem(t.id,'reddedildi')} disabled={onaylaniyorId===t.id} style={{ ...actionBtnStyle, color:'#f87171' }} title="Reddet"><XCircle size={13} /></button>
                            <button onClick={()=>handleTalepIslem(t.id,'onaylandi')} disabled={onaylaniyorId===t.id} style={{ ...actionBtnStyle, color:'#4ade80', background:'rgba(34,197,94,0.1)' }} title="Onayla"><CheckCircle size={13} /></button>
                          </div>:'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {sekme === 'ayarlar' && (
            <div style={{ maxWidth:480 }}>
              <div style={{ background: bakimAktif?'rgba(127,29,29,0.3)':'#111827', border: bakimAktif?'1px solid #991b1b':'1px solid #1e2d45', borderRadius:14, padding:'24px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <div style={{ width:36, height:36, background: bakimAktif?'rgba(239,68,68,0.2)':'rgba(59,130,246,0.1)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Zap size={18} color={bakimAktif?'#f87171':'#60a5fa'} />
                  </div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, color:'#f8fafc' }}>Bakım Modu</div>
                    <div style={{ fontSize:10, color: bakimAktif?'#fca5a5':'#475569', textTransform:'uppercase', letterSpacing:1 }}>{bakimAktif?'Şu an Aktif':'Standby'}</div>
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:10, fontWeight:800, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Bakım Mesajı</label>
                  <input style={{ width:'100%', height:40, padding:'0 12px', background: bakimAktif?'rgba(0,0,0,0.2)':'#0a1628', border: bakimAktif?'1px solid #991b1b':'1px solid #1e2d45', borderRadius:8, color:'#f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }} value={bakimMesaji} onChange={e=>setBakimMesaji(e.target.value)} placeholder="Kullanıcılara gösterilecek mesaj..." />
                </div>
                <button onClick={handleBakimToggle} disabled={bakimGuncelleniyor} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:7, height:42, borderRadius:8, border:'none', background: bakimAktif?'#fff':'rgba(255,255,255,0.06)', color: bakimAktif?'#7f1d1d':'#f1f5f9', fontWeight:800, fontSize:12, cursor:'pointer' }}>
                  {bakimGuncelleniyor?'Bekleyin...':bakimAktif?'BAKIM MODUNU KAPAT':'BAKIM MODUNU AÇ'}
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      {selectedOkul && (
        <div style={modalOverlayStyle}><div style={modalContentStyle}>
          <h3 style={{ fontSize:17, fontWeight:700, marginBottom:6, color:'#f1f5f9' }}>Lisans Ayarları</h3>
          <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>{selectedOkul.okullar?.ad}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div><label style={labelStyle}>Lisans Bitiş Tarihi</label><input type="date" style={inputStyle} value={lisansTarihi} onChange={e=>setLisansTarihi(e.target.value)} /></div>
            <div><label style={labelStyle}>Erişim Durumu</label><select style={inputStyle} value={odemeDurumu} onChange={e=>setOdemeDurumu(e.target.value)}><option value="aktif">Aktif</option><option value="borclu">Borçlu</option><option value="kapali">Kapalı</option></select></div>
            <div style={{ display:'flex', gap:10 }}><button onClick={handleUpdateLicense} disabled={okulUpdating} style={{ ...btnStyle, flex:1, background:'#16a34a', color:'white', border:'none', height:40 }}>Güncelle</button><button onClick={()=>setSelectedOkul(null)} style={{ ...btnStyle, flex:1, background:'#334155', color:'#e2e8f0', border:'none', height:40 }}>İptal</button></div>
          </div>
        </div></div>
      )}
      {selectedUser && (
        <div style={modalOverlayStyle}><div style={modalContentStyle}>
          <h3 style={{ fontSize:17, fontWeight:700, marginBottom:6, color:'#f1f5f9' }}>Şifre Değiştir</h3>
          <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>{selectedUser.email}</p>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div><label style={labelStyle}>Yeni Şifre</label><input type="password" style={inputStyle} placeholder="Min 6 karakter" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoFocus /></div>
            <div style={{ display:'flex', gap:10 }}><button onClick={handleUpdatePassword} disabled={pwUpdating} style={{ ...btnStyle, flex:1, background:'#16a34a', color:'white', border:'none', height:40 }}>Kaydet</button><button onClick={()=>setSelectedUser(null)} style={{ ...btnStyle, flex:1, background:'#334155', color:'#e2e8f0', border:'none', height:40 }}>Vazgeç</button></div>
          </div>
        </div></div>
      )}
      {showDuyuruModal && (
        <div style={modalOverlayStyle}><div style={modalContentStyle}>
          <h3 style={{ fontSize:17, fontWeight:700, marginBottom:20, color:'#f1f5f9' }}>Yeni Duyuru Yayınla</h3>
          <form onSubmit={handleDuyuruEkle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div><label style={labelStyle}>Tür</label><select style={inputStyle} value={duyuruTur} onChange={e=>setDuyuruTur(e.target.value)}><option value="info">Bilgilendirme</option><option value="warning">Uyarı</option><option value="danger">Kritik</option></select></div>
            <div><label style={labelStyle}>Başlık</label><input required style={inputStyle} value={duyuruBaslik} onChange={e=>setDuyuruBaslik(e.target.value)} /></div>
            <div><label style={labelStyle}>İçerik</label><textarea required style={{ ...inputStyle, height:90, paddingTop:10, resize:'none' } as any} value={duyuruIcerik} onChange={e=>setDuyuruIcerik(e.target.value)} /></div>
            <div style={{ display:'flex', gap:10 }}><button type="submit" disabled={duyuruKaydediliyor} style={{ ...btnStyle, flex:1, background:'#3b82f6', color:'white', border:'none', height:40 }}>{duyuruKaydediliyor?'Yayınlanıyor...':'Yayınla'}</button><button type="button" onClick={()=>setShowDuyuruModal(false)} style={{ ...btnStyle, flex:1, background:'#334155', color:'#e2e8f0', border:'none', height:40 }}>İptal</button></div>
          </form>
        </div></div>
      )}
      {showOdemeModal && (
        <div style={modalOverlayStyle}><div style={modalContentStyle}>
          <h3 style={{ fontSize:17, fontWeight:700, marginBottom:20, color:'#f1f5f9' }}>Yeni Ödeme Kaydı</h3>
          <form onSubmit={handleOdemeEkle} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div><label style={labelStyle}>Kurum</label><select required style={inputStyle} value={selectedOkulId||''} onChange={e=>setSelectedOkulId(Number(e.target.value))}><option value="">Seçiniz...</option>{okullar.map(o=><option key={o.id} value={o.id}>{o.ad}</option>)}</select></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}><div><label style={labelStyle}>Tutar (TL)</label><input required type="number" style={inputStyle} value={odemeTutar} onChange={e=>setOdemeTutar(e.target.value)} /></div><div><label style={labelStyle}>Yöntem</label><select style={inputStyle} value={odemeYontemi} onChange={e=>setOdemeYontemi(e.target.value)}><option value="Havale">Havale</option><option value="Kredi Kartı">Kredi Kartı</option><option value="Nakit">Nakit</option><option value="Diğer">Diğer</option></select></div></div>
            <div><label style={labelStyle}>Açıklama</label><input style={inputStyle} value={odemeAciklama} onChange={e=>setOdemeAciklama(e.target.value)} /></div>
            <div style={{ display:'flex', gap:10 }}><button type="submit" disabled={odemeKaydediliyor} style={{ ...btnStyle, flex:1, background:'#16a34a', color:'white', border:'none', height:40 }}>{odemeKaydediliyor?'Kaydediliyor...':'Kaydet'}</button><button type="button" onClick={()=>setShowOdemeModal(false)} style={{ ...btnStyle, flex:1, background:'#334155', color:'#e2e8f0', border:'none', height:40 }}>İptal</button></div>
          </form>
        </div></div>
      )}
    </div>
  )
}
"""

with open('c:/dev/kulup/app/(yonetim)/yonetim/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

kept = ''.join(lines[:641])
new_content = kept + new_jsx

with open('c:/dev/kulup/app/(yonetim)/yonetim/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done")
