import React, { useEffect, useMemo, useState } from 'react'
import { addEvent, addPhoto, getAllEvents, getLatestPhotos, getPhotosTimeline, getSettings, updateSettings } from '../db/queries'
import { msToHHMM, hhmmToMs, daysBetween } from '../lib/time'
import { sha256Hex, encryptJson } from '../lib/crypto'
import { db } from '../db/db'
import { CARBS, FATS, PROTEINS, VEGS } from './data/diet'
import { workoutForDate } from './data/workout'

type Mode = 'strict'|'admin'
type Tab = 'hoje'|'dieta'|'treino'|'fotos'|'auditoria'|'social'|'config'

function clamp(n:number,a:number,b:number){ return Math.max(a,Math.min(b,n)) }
function fmt(sec:number){ const m=Math.floor(sec/60), s=sec%60; return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

const DEFAULT_BLOCK = {
  title: 'O QUE FAZER — AGORA',
  timerSec: 25*60,
  tasks: [
    { id:'prayer', label:'Oração mínima', tag:'espiritual', checked:false },
    { id:'train', label:'Treino do dia', tag:'shape', checked:false },
    { id:'study', label:'Estudo 25/5 x2', tag:'intelecto', checked:false },
    { id:'water', label:'Água (3,5–4 L)', tag:'hormonal', checked:false },
    { id:'pur', label:'PUR-90 se ansiedade subir', tag:'psico', checked:false }
  ]
}

export default function App(){
  const [loaded,setLoaded]=useState(false)
  const [settings,setSettings]=useState<any>(null)
  const [mode,setMode]=useState<Mode>('strict')
  const [tab,setTab]=useState<Tab>('hoje')

  const [block,setBlock]=useState<any>({...DEFAULT_BLOCK})
  const [secLeft,setSecLeft]=useState(DEFAULT_BLOCK.timerSec)
  const [running,setRunning]=useState(false)

  const [pin,setPin]=useState('')
  const [pinMsg,setPinMsg]=useState('')

  const [energy,setEnergy]=useState(3)
  const [stress,setStress]=useState(3)
  const [focus,setFocus]=useState(3)
  const [libido,setLibido]=useState(3)

  const [audioUrl,setAudioUrl]=useState<string|null>(null)
  const [audioEl,setAudioEl]=useState<HTMLAudioElement|null>(null)
  const [audioStatus,setAudioStatus]=useState<'idle'|'blocked'|'playing'>('idle')

  const [latestPhotos,setLatestPhotos]=useState<any>({})
  const [timeline,setTimeline]=useState<any[]>([])
  const [timelineKind,setTimelineKind]=useState<'front'|'side'|'back'>('front')

  const workout = useMemo(()=>workoutForDate(new Date()), [])
  const contractOk = useMemo(()=>{
    const signed = settings?.contractSignedAt
    if(!signed) return false
    return daysBetween(signed, Date.now()) < (settings?.contractRenewEveryDays ?? 90)
  },[settings])

  useEffect(()=>{(async()=>{
    const s=await getSettings(); setSettings(s)
    setMode(s.strictMode?'strict':'admin')
    await addEvent('app_opened',{day:todayKey()})
    const a=await db.audio.get('main')
    if(a){ setAudioUrl(URL.createObjectURL(a.blob)) }
    setLatestPhotos(await getLatestPhotos())
    setLoaded(true)
  })()},[])

  useEffect(()=>{
    if(!loaded || !audioUrl) return
    const el=new Audio(audioUrl); el.loop=true; el.volume=0.6
    setAudioEl(el)
    ;(async()=>{
      if((settings?.audioEnabled ?? true) && (settings?.audioArmed ?? false)){
        try{ await el.play(); setAudioStatus('playing') } catch { setAudioStatus('blocked') }
      }
    })()
    return ()=>{ el.pause(); try{ URL.revokeObjectURL(audioUrl) }catch{} }
  },[loaded,audioUrl])

  useEffect(()=>{
    if(!running) return
    const t=setInterval(()=>{
      setSecLeft((s:number)=>{
        if(s<=1){ setRunning(false); addEvent('timer_completed',{title:block.title}); return 0 }
        return s-1
      })
    },1000)
    return ()=>clearInterval(t)
  },[running,block.title])

  const npcLine = useMemo(()=>{
    if(stress>=4) return 'Estresse alto: respira 4-6 por 3 min. Depois ação curta. Sem decisões grandes.'
    if(running) return 'Executa o próximo minuto. Sem drama.'
    if(secLeft===0) return 'Acabou. Conclui ou registra falha. Sem enrolar.'
    return 'Só o próximo passo. O resto é ruído.'
  },[stress,running,secLeft])

  async function toggleTask(id:string){
    setBlock((b:any)=>({...b, tasks:b.tasks.map((t:any)=>t.id===id?{...t,checked:!t.checked}:t)}))
    await addEvent('task_toggled',{id})
  }

  async function startStop(){
    if(!running){ setRunning(true); await addEvent('block_started',{title:block.title,secLeft}) }
    else setRunning(false)
  }
  function reset(){ setRunning(false); setSecLeft(block.timerSec) }

  async function critical(kind:'pornografia'|'aposta'){
    const penalty=settings?.criticalPenalty ?? 30
    const newHonor=clamp((settings?.honor ?? 100)-penalty,0,100)
    await updateSettings({ honor:newHonor, strictMode:true })
    const s2=await getSettings(); setSettings(s2); setMode('strict')
    await addEvent('critical_violation',{kind,penalty})
  }

  async function tryExitStrict(){
    if(!settings?.strictPinHash){ setPinMsg('Defina um PIN no Admin.'); return }
    const h=await sha256Hex(pin)
    if(h===settings.strictPinHash){
      await updateSettings({ strictMode:false })
      const s2=await getSettings(); setSettings(s2); setMode('admin'); setPin(''); setPinMsg('')
      await addEvent('strict_mode_changed',{enabled:false})
    } else setPinMsg('PIN incorreto.')
  }

  async function setStrictPin(newPin:string){
    if(!/^[0-9]{4,8}$/.test(newPin)){ setPinMsg('PIN 4–8 dígitos.'); return }
    await updateSettings({ strictPinHash: await sha256Hex(newPin) })
    setSettings(await getSettings()); setPinMsg('PIN definido.')
  }

  async function enableStrict(){
    await updateSettings({ strictMode:true })
    const s2=await getSettings(); setSettings(s2); setMode('strict')
    await addEvent('strict_mode_changed',{enabled:true})
  }

  async function uploadAudio(file:File){
    await db.audio.put({ id:'main', mime:file.type||'audio/mpeg', blob:file, updatedAt:Date.now() })
    setAudioUrl(URL.createObjectURL(file))
    setAudioStatus('idle')
  }
  async function armAudio(){
    if(!audioEl) return
    try{ await audioEl.play(); setAudioStatus('playing'); await updateSettings({audioArmed:true}); setSettings(await getSettings()) }
    catch{ setAudioStatus('blocked') }
  }
  async function toggleAudio(){
    if(!audioEl) return
    const enabled=!(settings?.audioEnabled ?? true)
    await updateSettings({audioEnabled:enabled})
    const s2=await getSettings(); setSettings(s2)
    if(!enabled){ audioEl.pause(); setAudioStatus('idle') }
    else if(s2.audioArmed){ try{ await audioEl.play(); setAudioStatus('playing') } catch { setAudioStatus('blocked') } }
  }

  async function logMood(){
    await addEvent('mood_logged',{energy,stress,focus,libido})
    if(stress>=4) await addEvent('pur90_started',{auto:true})
  }

  async function addPhotoFrom(kind:'front'|'side'|'back', file:File){
    await addPhoto(kind,file)
    setLatestPhotos(await getLatestPhotos())
  }
  async function loadTimeline(kind:'front'|'side'|'back'){
    setTimelineKind(kind)
    setTimeline(await getPhotosTimeline(kind,12))
  }

  async function exportBackup(pass:string){
    const s=await getSettings()
    const events=await getAllEvents()
    const payload={settings:s,events,exportedAt:Date.now(),app:'High Aura',version:2}
    const enc=await encryptJson(pass,payload)
    const blob=new Blob([enc],{type:'application/octet-stream'})
    const a=document.createElement('a')
    a.href=URL.createObjectURL(blob)
    a.download=`high-aura-backup-${todayKey()}.bin`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if(!loaded) return <div className="container"><div className="card">Carregando...</div></div>

  const canSeeTabs = mode==='admin' && contractOk
  const tabs: {id:Tab; label:string}[] = [
    {id:'hoje',label:'HOJE'},
    {id:'dieta',label:'DIETA'},
    {id:'treino',label:'TREINO'},
    {id:'fotos',label:'FOTOS'},
    {id:'auditoria',label:'AUDITORIA'},
    {id:'social',label:'SOCIAL'},
    {id:'config',label:'CONFIG'}
  ]

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="title">High Aura</div>
          <div className="sub">Privado • Offline • Militar</div>
        </div>
        <div className="badges">
          <div className="badge"><strong>HONRA</strong> {settings.honor}/100</div>
          <div className="badge"><strong>MODO</strong> {settings.strictMode?'ESTRITO':'ADMIN'}</div>
        </div>
      </div>

      {mode==='admin' && (
        <div className="row" style={{marginTop:12}}>
          {tabs.map(t=>(
            <button key={t.id} className="btn" onClick={()=>setTab(t.id)} style={{opacity:tab===t.id?1:0.75}}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h2>O QUE FAZER</h2>
          <div className="npc"><div className="name">Mentor</div><div>{npcLine}</div></div>
          <div className="hr"></div>

          <div className="row" style={{justifyContent:'space-between'}}>
            <div>
              <div className="small">{block.title}</div>
              <div className="timer">{fmt(secLeft)}</div>
              <div className="small">{running?'Rodando':'Parado'}</div>
            </div>
            <div style={{minWidth:220}}>
              <button className="bigbtn primary" onClick={startStop}>{running?'PAUSAR':'INICIAR'}</button>
              <div style={{height:10}}/>
              <button className="bigbtn" onClick={reset}>RESET</button>
            </div>
          </div>

          <div className="list">
            {block.tasks.map((t:any)=>(
              <div className="task" key={t.id}>
                <label>
                  <input type="checkbox" checked={t.checked} onChange={()=>toggleTask(t.id)} />
                  <span>{t.label}</span>
                </label>
                <span className="tag">{t.tag}</span>
              </div>
            ))}
          </div>

          <div className="actions">
            <button className="btn ok" onClick={()=>addEvent('block_completed',{title:block.title})}>CONCLUÍDO</button>
            <button className="btn bad" onClick={()=>addEvent('block_failed',{title:block.title})}>FALHEI</button>
          </div>

          <div className="hr"></div>
          <div className="row">
            <button className="btn bad" onClick={()=>critical('pornografia')}>Falha crítica: Pornografia</button>
            <button className="btn bad" onClick={()=>critical('aposta')}>Falha crítica: Aposta</button>
          </div>
        </div>

        <div className="card">
          <h2>{mode==='strict'?'MODO ESTRITO':'PAINEL'}</h2>

          <div className="row" style={{justifyContent:'space-between'}}>
            <div className="pill"><span className="dot"></span> Áudio</div>
            <button className="btn" onClick={toggleAudio}>{settings.audioEnabled?'DESLIGAR':'LIGAR'}</button>
          </div>
          <div className="small" style={{marginTop:8}}>Upload música (offline)</div>
          <input type="file" accept="audio/*" onChange={e=>{const f=e.target.files?.[0]; if(f) uploadAudio(f)}} />
          <div className="row" style={{marginTop:10}}>
            <button className="btn ok" onClick={armAudio} disabled={!audioEl || !settings.audioEnabled}>ARMAR ÁUDIO</button>
            <span className="small">Status: {audioStatus}{settings.audioArmed?' (armado)':''}</span>
          </div>

          <div className="hr"></div>
          <fieldset>
            <legend>Humor (5s)</legend>
            <div className="row" style={{marginTop:8}}>
              <select value={energy} onChange={e=>setEnergy(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Energia {n}</option>)}</select>
              <select value={stress} onChange={e=>setStress(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Estresse {n}</option>)}</select>
              <select value={focus} onChange={e=>setFocus(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Foco {n}</option>)}</select>
              <select value={libido} onChange={e=>setLibido(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Libido {n}</option>)}</select>
            </div>
            <div style={{height:10}}/>
            <button className="btn ok" onClick={logMood}>REGISTRAR</button>
          </fieldset>

          <div className="hr"></div>

          {mode==='strict' ? (
            <>
              <div className="small">Saída só por PIN</div>
              <div className="row" style={{marginTop:8}}>
                <input type="password" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)} />
                <button className="btn" onClick={tryExitStrict}>SAIR</button>
              </div>
              <div className="small">{pinMsg}</div>
              <div className="hr"></div>
              <div className="small">Âncoras: acordar {msToHHMM(settings.wakeMs)} • almoço {msToHHMM(settings.lunchMs)} • dormir {msToHHMM(settings.sleepMs)}</div>
            </>
          ) : (
            <>
              {!contractOk ? (
                <fieldset>
                  <legend>Contrato (obrigatório)</legend>
                  <div className="small">Clique e acabou. Sem acesso aos módulos sem contrato.</div>
                  <button className="btn ok" onClick={async()=>{ await updateSettings({contractSignedAt:Date.now()}); setSettings(await getSettings()); await addEvent('contract_signed',{}) }}>ACEITO O CONTRATO</button>
                </fieldset>
              ) : (
                <div className="small">Contrato ok.</div>
              )}

              <div className="hr"></div>
              <fieldset>
                <legend>PIN do Modo Estrito</legend>
                <div className="row" style={{marginTop:8}}>
                  <input type="password" placeholder="Novo PIN (4–8 dígitos)" value={pin} onChange={e=>setPin(e.target.value)} />
                  <button className="btn ok" onClick={()=>setStrictPin(pin)}>SALVAR PIN</button>
                </div>
                <div className="small">{pinMsg}</div>
              </fieldset>
              <div style={{height:10}}/>
              <button className="bigbtn primary" onClick={enableStrict}>ATIVAR MODO ESTRITO</button>

              <div className="hr"></div>
              <fieldset>
                <legend>Horários</legend>
                <div className="row">
                  <div style={{flex:1}}>
                    <div className="small">Acordar</div>
                    <input type="time" value={msToHHMM(settings.wakeMs)} onChange={async e=>{ await updateSettings({wakeMs:hhmmToMs(e.target.value)}); setSettings(await getSettings()) }} />
                  </div>
                  <div style={{flex:1}}>
                    <div className="small">Almoço</div>
                    <input type="time" value={msToHHMM(settings.lunchMs)} onChange={async e=>{ await updateSettings({lunchMs:hhmmToMs(e.target.value)}); setSettings(await getSettings()) }} />
                  </div>
                  <div style={{flex:1}}>
                    <div className="small">Dormir</div>
                    <input type="time" value={msToHHMM(settings.sleepMs)} onChange={async e=>{ await updateSettings({sleepMs:hhmmToMs(e.target.value)}); setSettings(await getSettings()) }} />
                  </div>
                </div>
              </fieldset>
            </>
          )}
        </div>
      </div>

      {canSeeTabs && (
        <div className="card" style={{marginTop:14}}>
          {tab==='hoje' && (
            <>
              <h2>HOJE</h2>
              <div className="small">Treino: <strong>{workout.title}</strong></div>
              <div className="row" style={{marginTop:10}}>
                <span className="pill">Meta peso: {settings.targetWeightKg} kg</span>
                <span className="pill">Dieta: {settings.kcal} kcal • P {settings.proteinG}g • C {settings.carbsG}g • G {settings.fatG}g</span>
              </div>
            </>
          )}

          {tab==='dieta' && (
            <>
              <h2>DIETA</h2>
              <div className="small">Regra: 1 proteína + 1 carbo + vegetal + (gordura opcional). Todas opções valem em qualquer refeição.</div>
              <div className="hr"></div>
              <div className="row">
                <div style={{flex:1}}>
                  <div className="small"><strong>Proteínas</strong></div>
                  <div className="list">{PROTEINS.map(p=><div key={p.id} className="task"><span>{p.label}</span><span className="tag">{p.hint}</span></div>)}</div>
                </div>
                <div style={{flex:1}}>
                  <div className="small"><strong>Carbos</strong></div>
                  <div className="list">{CARBS.map(c=><div key={c.id} className="task"><span>{c.label}</span><span className="tag">{c.hint}</span></div>)}</div>
                </div>
              </div>
              <div className="hr"></div>
              <div className="row">
                <div style={{flex:1}}>
                  <div className="small"><strong>Gorduras</strong></div>
                  <div className="list">{FATS.map(f=><div key={f.id} className="task"><span>{f.label}</span><span className="tag">opcional</span></div>)}</div>
                </div>
                <div style={{flex:1}}>
                  <div className="small"><strong>Vegetais</strong></div>
                  <div className="list">{VEGS.map(v=><div key={v} className="task"><span>{v}</span><span className="tag">livre</span></div>)}</div>
                </div>
              </div>
            </>
          )}

          {tab==='treino' && (
            <>
              <h2>TREINO</h2>
              <div className="small">{workout.title}</div>
              <div className="hr"></div>
              <div className="list">
                {workout.exercises.length===0 ? <div className="small">Descanso.</div> :
                  workout.exercises.map((ex,idx)=>(
                    <div className="task" key={idx}>
                      <div>
                        <div><strong>{ex.name}</strong></div>
                        <div className="small">{ex.sets} séries • {ex.reps} reps • descanso {Math.round(ex.restSec/60)} min</div>
                        {ex.note && <div className="small">{ex.note}</div>}
                      </div>
                      <span className="tag">PPL</span>
                    </div>
                  ))
                }
              </div>
              <div className="hr"></div>
              <div className="npc"><div className="name">Mentor</div><div>Progressão simples: bateu topo de reps em todas as séries → sobe carga na próxima sessão.</div></div>
            </>
          )}

          {tab==='fotos' && (
            <>
              <h2>FOTOS</h2>
              <div className="small">Domingo. Sem filtro. Mesma luz.</div>
              <div className="hr"></div>
              <div className="row">
                {(['front','side','back'] as const).map(k=>(
                  <div key={k} style={{flex:1}}>
                    <div className="small"><strong>{k.toUpperCase()}</strong></div>
                    <input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]; if(f) addPhotoFrom(k,f)}} />
                  </div>
                ))}
              </div>
              <div className="hr"></div>
              <div className="row">{(['front','side','back'] as const).map(k=><button key={k} className="btn" onClick={()=>loadTimeline(k)}>Timeline {k}</button>)}</div>
              <div className="hr"></div>
              <div className="row" style={{flexWrap:'wrap'}}>
                {timeline.map((p:any)=>{
                  const url=URL.createObjectURL(p.blob)
                  return (
                    <div key={p.id} className="card" style={{width:180,padding:10}}>
                      <div className="small">{new Date(p.ts).toLocaleDateString()}</div>
                      <img src={url} style={{width:'100%',borderRadius:12,border:'1px solid #222'}} onLoad={()=>URL.revokeObjectURL(url)} />
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab==='auditoria' && (
            <>
              <h2>AUDITORIA</h2>
              <div className="small">1 mentira + 1 ajuste. Sem texto bonito.</div>
              <div className="hr"></div>
              <input type="text" placeholder="Onde você mentiu pra si mesmo?" onKeyDown={e=>{}} />
              <div style={{height:10}}/>
              <input type="text" placeholder="Qual ajuste único da semana?" />
              <div style={{height:10}}/>
              <button className="btn ok" onClick={()=>addEvent('audit_submitted',{weekOf:todayKey()})}>REGISTRAR</button>
            </>
          )}

          {tab==='social' && (
            <>
              <h2>SOCIAL — MENTOR</h2>
              <div className="npc">
                <div className="name">Mentor</div>
                <div>
                  Script (mulher):<br/>
                  1) Postura + olhar 3s + fala lenta.<br/>
                  2) "Oi, como foi sua semana na facul?"<br/>
                  3) Pergunta aberta + escuta. Sem explicar demais.<br/>
                  4) Fecha cedo: "Boa. Depois a gente continua."
                </div>
              </div>
            </>
          )}

          {tab==='config' && (
            <>
              <h2>CONFIG</h2>
              <fieldset>
                <legend>Dieta</legend>
                <div className="row">
                  <div style={{flex:1}}><div className="small">Kcal</div><input type="number" value={settings.kcal} onChange={async e=>{await updateSettings({kcal:Number(e.target.value)}); setSettings(await getSettings())}} /></div>
                  <div style={{flex:1}}><div className="small">Proteína (g)</div><input type="number" value={settings.proteinG} onChange={async e=>{await updateSettings({proteinG:Number(e.target.value)}); setSettings(await getSettings())}} /></div>
                </div>
                <div className="row" style={{marginTop:8}}>
                  <div style={{flex:1}}><div className="small">Carbo (g)</div><input type="number" value={settings.carbsG} onChange={async e=>{await updateSettings({carbsG:Number(e.target.value)}); setSettings(await getSettings())}} /></div>
                  <div style={{flex:1}}><div className="small">Gordura (g)</div><input type="number" value={settings.fatG} onChange={async e=>{await updateSettings({fatG:Number(e.target.value)}); setSettings(await getSettings())}} /></div>
                </div>
              </fieldset>
              <div className="hr"></div>
              <fieldset>
                <legend>Backup criptografado</legend>
                <div className="row" style={{marginTop:8}}>
                  <input id="bp2" type="password" placeholder="Senha >= 8" />
                  <button className="btn" onClick={async()=>{
                    const el=document.getElementById('bp2') as HTMLInputElement
                    if(!el.value || el.value.length<8) return alert('Senha mínima: 8')
                    await exportBackup(el.value)
                  }}>EXPORTAR</button>
                </div>
              </fieldset>
            </>
          )}
        </div>
      )}
    </div>
  )
}
