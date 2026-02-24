import React, { useEffect, useMemo, useState } from 'react'
import { addEvent, getAllEvents, getSettings, updateSettings } from '../db/queries'
import { msToHHMM, hhmmToMs, startOfToday, daysBetween } from '../lib/time'
import { sha256Hex } from '../lib/crypto'
import { db } from '../db/db'
import { decryptJson, encryptJson } from '../lib/crypto'

type Mode = 'strict' | 'admin'

type FailReason =
  | 'fome'
  | 'sono'
  | 'ansiedade'
  | 'procrastinacao'
  | 'gatilho_sexual'
  | 'sem_tempo'
  | 'ruminacao'

const FAIL_REASONS: { id: FailReason; label: string }[] = [
  { id: 'fome', label: 'Fome' },
  { id: 'sono', label: 'Sono' },
  { id: 'ansiedade', label: 'Ansiedade' },
  { id: 'procrastinacao', label: 'Procrastinação' },
  { id: 'gatilho_sexual', label: 'Gatilho sexual' },
  { id: 'sem_tempo', label: 'Sem tempo' },
  { id: 'ruminacao', label: 'Ruminação' }
]

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
}

const DEFAULT_BLOCK = {
  title: 'Bloco Atual',
  timerSec: 25*60,
  tasks: [
    { id:'prayer', label:'Oração (10 min)', tag:'espiritual', checked:false },
    { id:'train', label:'Treino guiado (PPL)', tag:'shape', checked:false },
    { id:'study', label:'Estudo 25/5 x2', tag:'intelecto', checked:false },
    { id:'water', label:'Água (3,5–4 L) — avançar', tag:'hormonal', checked:false },
    { id:'pur', label:'PUR-90 se ansiedade subir', tag:'psicologico', checked:false }
  ]
}

export default function App() {
  const [mode, setMode] = useState<Mode>('strict')
  const [loaded, setLoaded] = useState(false)
  const [settings, setSettings] = useState<any>(null)

  // state for today's block
  const [block, setBlock] = useState<any>(() => ({...DEFAULT_BLOCK}))
  const [running, setRunning] = useState(false)
  const [secLeft, setSecLeft] = useState(block.timerSec)
  const [failReason, setFailReason] = useState<FailReason>('ansiedade')

  // mood
  const [energy, setEnergy] = useState(3)
  const [stress, setStress] = useState(3)
  const [focus, setFocus] = useState(3)
  const [libido, setLibido] = useState(3)

  // audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const [audioStatus, setAudioStatus] = useState<'idle'|'armed'|'blocked'|'playing'>('idle')

  // admin PIN to exit strict
  const [pin, setPin] = useState('')
  const [pinMsg, setPinMsg] = useState<string>('')

  const [contractName, setContractName] = useState('Flaviano')

  const dayIndex = useMemo(() => {
    const day0 = settings?.day0 ?? Date.now()
    return daysBetween(day0, Date.now()) + 1
  }, [settings])

  useEffect(() => {
    (async () => {
      const s = await getSettings()
      setSettings(s)
      setContractName(s.contractName || 'Flaviano')
      // strict by default if enabled
      setMode(s.strictMode ? 'strict' : 'admin')
      await addEvent('app_opened', { day: todayKey() })

      // load audio blob if any
      const a = await db.audio.get('main')
      if (a) {
        const url = URL.createObjectURL(a.blob)
        setAudioUrl(url)
      }
      setLoaded(true)
    })()
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (!audioUrl) return
    const el = new Audio(audioUrl)
    el.loop = true
    el.volume = 0.6
    setAudioEl(el)
    return () => { el.pause(); URL.revokeObjectURL(audioUrl) }
  }, [loaded, audioUrl])

  // timer loop
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setSecLeft((s:number) => {
        if (s <= 1) {
          setRunning(false)
          addEvent('timer_completed', { block: block.title })
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [running, block.title])

  const npcLine = useMemo(() => {
    // Mentor style, context-aware
    if (stress >= 4) return "Respira. 4 entra, 6 sai. Depois ação concreta. Sem decisão grande hoje."
    if (running) return "Foco no próximo minuto. Execução limpa. Sem pressa."
    if (secLeft === 0) return "Timer encerrou. Registra. Conclui ou ajusta. Nada de enrolar."
    return "Você não precisa vencer o mês agora. Só execute o próximo passo."
  }, [running, secLeft, stress])

  const honorLabel = useMemo(() => {
    const h = settings?.honor ?? 100
    if (h >= 85) return 'FORJADO'
    if (h >= 70) return 'ESTRUTURADO'
    if (h >= 60) return 'EM FORMAÇÃO'
    return 'INSTÁVEL'
  }, [settings])

  async function toggleTask(id: string) {
    setBlock((b:any) => {
      const tasks = b.tasks.map((t:any) => t.id === id ? { ...t, checked: !t.checked } : t)
      return { ...b, tasks }
    })
    await addEvent('task_toggled', { id })
  }

  async function startStop() {
    if (!running) {
      setRunning(true)
      await addEvent('block_started', { title: block.title, timerSec: secLeft })
    } else {
      setRunning(false)
      await addEvent('timer_tick', { pausedAt: secLeft })
    }
  }

  async function resetTimer() {
    setRunning(false)
    setSecLeft(block.timerSec)
  }

  async function completeBlock() {
    setRunning(false)
    await addEvent('block_completed', { title: block.title })
  }

  async function failBlock() {
    setRunning(false)
    await addEvent('block_failed', { title: block.title, reason: failReason })
    // mark mental pattern
    await addEvent('interrupt_cycle', { reason: failReason })
  }

  async function criticalViolation(kind: 'pornografia'|'aposta') {
    const penalty = settings?.criticalPenalty ?? 30
    const newHonor = clamp((settings?.honor ?? 100) - penalty, 0, 100)
    await updateSettings({ honor: newHonor, strictMode: true })
    const s2 = await getSettings()
    setSettings(s2)
    setMode('strict')
    await addEvent('critical_violation', { kind, penalty })
  }

  async function logMood() {
    await addEvent('mood_logged', { energy, stress, focus, libido })
    // auto cortisol protocol trigger hint: we keep it as event; UI can react
    if (stress >= 4 && energy <= 2) {
      await addEvent('pur90_started', { auto: true })
    }
  }

  async function armAudio() {
    if (!audioEl) return
    try {
      await audioEl.play()
      setAudioStatus('playing')
      await updateSettings({ audioArmed: true })
      const s2 = await getSettings(); setSettings(s2)
    } catch (e) {
      setAudioStatus('blocked')
    }
  }

  async function toggleAudio() {
    if (!audioEl) return
    const enabled = !(settings?.audioEnabled ?? true)
    await updateSettings({ audioEnabled: enabled })
    const s2 = await getSettings(); setSettings(s2)
    if (!enabled) {
      audioEl.pause()
      setAudioStatus('idle')
    } else {
      // try to play if armed
      if (settings?.audioArmed) {
        try { await audioEl.play(); setAudioStatus('playing') } catch { setAudioStatus('blocked') }
      }
    }
  }

  async function uploadAudio(file: File) {
    await db.audio.put({ id: 'main', mime: file.type || 'audio/mpeg', blob: file, updatedAt: Date.now() })
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    setAudioStatus('idle')
  }

  async function ensureContract() {
    const signedAt = settings?.contractSignedAt
    const renewDays = settings?.contractRenewEveryDays ?? 90
    if (!signedAt) return false
    const elapsed = daysBetween(signedAt, Date.now())
    return elapsed < renewDays
  }

  async function signContract() {
    await updateSettings({ contractSignedAt: Date.now(), contractName })
    const s2 = await getSettings(); setSettings(s2)
    await addEvent('contract_signed', { name: contractName, version: settings?.contractVersion ?? 1 })
  }

  async function renewContract() {
    await updateSettings({ contractSignedAt: Date.now() })
    const s2 = await getSettings(); setSettings(s2)
    await addEvent('contract_renewed', { at: Date.now() })
  }

  async function tryExitStrict() {
    const hash = await sha256Hex(pin)
    if (!settings?.strictPinHash) {
      setPinMsg('Defina um PIN primeiro em Admin.')
      return
    }
    if (hash === settings.strictPinHash) {
      await updateSettings({ strictMode: false })
      const s2 = await getSettings(); setSettings(s2)
      setMode('admin')
      setPin('')
      setPinMsg('')
      await addEvent('strict_mode_changed', { enabled: false })
    } else {
      setPinMsg('PIN incorreto.')
    }
  }

  async function setStrictPin(newPin: string) {
    if (!/^[0-9]{4,8}$/.test(newPin)) {
      setPinMsg('PIN precisa ter 4 a 8 dígitos.')
      return
    }
    const hash = await sha256Hex(newPin)
    await updateSettings({ strictPinHash: hash })
    const s2 = await getSettings(); setSettings(s2)
    setPinMsg('PIN definido.')
  }

  async function enableStrict() {
    await updateSettings({ strictMode: true })
    const s2 = await getSettings(); setSettings(s2)
    setMode('strict')
    await addEvent('strict_mode_changed', { enabled: true })
  }

  async function exportEncrypted(passphrase: string) {
    const s = await getSettings()
    const events = await getAllEvents()
    const payload = { settings: s, events, exportedAt: Date.now(), app: 'High Aura', version: 1 }
    const enc = await encryptJson(passphrase, payload)
    const blob = new Blob([enc], { type: 'application/octet-stream' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `high-aura-backup-${todayKey()}.bin`
    a.click()
    URL.revokeObjectURL(a.href)
    await addEvent('backup_exported', { bytes: enc.byteLength })
  }

  async function importEncrypted(file: File, passphrase: string) {
    const buf = await file.arrayBuffer()
    const payload = await decryptJson(passphrase, buf)
    if (!payload?.events || !payload?.settings) throw new Error('Backup inválido')
    // merge: naive append events; overwrite settings
    await db.transaction('rw', db.events, db.settings, async () => {
      await db.settings.put(payload.settings)
      // best-effort append
      for (const ev of payload.events) {
        delete ev.id
        await db.events.add(ev)
      }
    })
    const s2 = await getSettings(); setSettings(s2)
    await addEvent('backup_imported', { importedAt: Date.now() })
  }

  if (!loaded) return <div className="container"><div className="card">Carregando...</div></div>

  // Contract gate (only in admin; strict always shows TODO)
  const contractOk = settings?.contractSignedAt ? (daysBetween(settings.contractSignedAt, Date.now()) < (settings.contractRenewEveryDays ?? 90)) : false

  const showAdmin = mode === 'admin'

  const dayText = `Dia ${dayIndex} de Forja`

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="title">High Aura</div>
          <div className="sub">{dayText} • Flaviano</div>
        </div>
        <div className="badges">
          <div className="badge"><strong>HONRA</strong> {settings?.honor ?? 100}/100</div>
          <div className="badge"><strong>ESTADO</strong> {honorLabel}</div>
          <div className="badge"><strong>MODO</strong> {settings?.strictMode ? 'ESTRITO' : 'ADMIN'}</div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>O QUE FAZER</h2>
          <div className="npc">
            <div className="name">Mentor</div>
            <div>{npcLine}</div>
          </div>

          <div className="hr"></div>

          <div className="row" style={{justifyContent:'space-between'}}>
            <div>
              <div className="small">{block.title}</div>
              <div className="timer">{formatTime(secLeft)}</div>
              <div className="small">Preset: {Math.floor(block.timerSec/60)} min • {running ? 'Rodando' : 'Parado'}</div>
            </div>
            <div style={{minWidth:220}}>
              <button className="bigbtn primary" onClick={startStop}>{running ? 'PAUSAR' : 'INICIAR'}</button>
              <div style={{height:10}}/>
              <button className="bigbtn" onClick={resetTimer}>RESET</button>
            </div>
          </div>

          <div className="list">
            {block.tasks.map((t:any) => (
              <div className="task" key={t.id}>
                <label>
                  <input type="checkbox" checked={t.checked} onChange={() => toggleTask(t.id)} />
                  <span>{t.label}</span>
                </label>
                <span className="tag">{t.tag}</span>
              </div>
            ))}
          </div>

          <div className="actions">
            <button className="btn ok" onClick={completeBlock}>CONCLUÍDO</button>
            <button className="btn bad" onClick={failBlock}>FALHEI</button>
          </div>

          <div className="row" style={{marginTop:10}}>
            <span className="pill"><span className="dot"></span> SOS: PUR-90</span>
            <button className="btn warn" onClick={async ()=>{
              await addEvent('pur90_started', { manual: true })
              setRunning(false)
              setSecLeft(3*60)
              setBlock((b:any)=>({ ...b, title:'PUR-90 • Respiração 4-6 (3 min)', timerSec: 3*60 }))
            }}>INICIAR PUR-90</button>
            <button className="btn" onClick={async ()=>{
              await addEvent('interrupt_cycle', { manual: true })
              setFailReason('ruminacao')
            }}>INTERROMPER CICLO</button>
          </div>

          <div className="hr"></div>
          <div className="row">
            <div style={{flex:1}}>
              <div className="small">Motivo de falha (se falhar):</div>
              <select value={failReason} onChange={e=>setFailReason(e.target.value as any)}>
                {FAIL_REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div style={{flex:1}}>
              <div className="small">Crítico:</div>
              <div className="row">
                <button className="btn bad" onClick={()=>criticalViolation('pornografia')}>Pornografia</button>
                <button className="btn bad" onClick={()=>criticalViolation('aposta')}>Aposta</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>CONTROLE RÁPIDO</h2>

          <div className="row" style={{justifyContent:'space-between'}}>
            <div className="pill"><span className="dot"></span> Áudio</div>
            <button className="btn" onClick={toggleAudio}>{(settings?.audioEnabled ?? true) ? 'DESLIGAR' : 'LIGAR'}</button>
          </div>

          <div className="small" style={{marginTop:8}}>Upload música (offline):</div>
          <input type="file" accept="audio/*" onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadAudio(f) }} />
          <div className="row" style={{marginTop:10}}>
            <button className="btn ok" onClick={armAudio} disabled={!audioEl || !(settings?.audioEnabled ?? true)}>
              ARMAR ÁUDIO
            </button>
            <span className="small">Status: {audioStatus}{settings?.audioArmed ? ' (armado)' : ''}</span>
          </div>

          <div className="hr"></div>

          <fieldset>
            <legend>Humor (5s)</legend>
            <div className="small">Energia / Estresse / Foco / Libido</div>
            <div className="row" style={{marginTop:8}}>
              <select value={energy} onChange={e=>setEnergy(Number(e.target.value))}>
                {[1,2,3,4,5].map(n=> <option key={n} value={n}>Energia {n}</option>)}
              </select>
              <select value={stress} onChange={e=>setStress(Number(e.target.value))}>
                {[1,2,3,4,5].map(n=> <option key={n} value={n}>Estresse {n}</option>)}
              </select>
              <select value={focus} onChange={e=>setFocus(Number(e.target.value))}>
                {[1,2,3,4,5].map(n=> <option key={n} value={n}>Foco {n}</option>)}
              </select>
              <select value={libido} onChange={e=>setLibido(Number(e.target.value))}>
                {[1,2,3,4,5].map(n=> <option key={n} value={n}>Libido {n}</option>)}
              </select>
            </div>
            <div style={{height:10}}/>
            <button className="btn ok" onClick={logMood}>REGISTRAR</button>
          </fieldset>

          <div className="hr"></div>

          {showAdmin ? (
            <>
              <h2>ADMIN</h2>

              {!contractOk ? (
                <fieldset>
                  <legend>Contrato (obrigatório)</legend>
                  <div className="small">Nome no contrato</div>
                  <input type="text" value={contractName} onChange={e=>setContractName(e.target.value)} />
                  <div style={{height:10}}/>
                  {!settings?.contractSignedAt ? (
                    <button className="btn ok" onClick={signContract}>ACEITO O CONTRATO</button>
                  ) : (
                    <button className="btn ok" onClick={renewContract}>REVALIDAR CONTRATO (90 dias)</button>
                  )}
                </fieldset>
              ) : (
                <div className="small">Contrato ok. Próxima renovação em {(settings.contractRenewEveryDays ?? 90) - daysBetween(settings.contractSignedAt, Date.now())} dias.</div>
              )}

              <div className="hr"></div>

              <fieldset>
                <legend>Horários (ajustáveis)</legend>
                <div className="row">
                  <div style={{flex:1}}>
                    <div className="small">Acordar</div>
                    <input type="time" value={msToHHMM(settings?.wakeMs ?? 0)} onChange={async e=>{
                      await updateSettings({ wakeMs: hhmmToMs(e.target.value) })
                      setSettings(await getSettings())
                    }} />
                  </div>
                  <div style={{flex:1}}>
                    <div className="small">Almoço</div>
                    <input type="time" value={msToHHMM(settings?.lunchMs ?? 0)} onChange={async e=>{
                      await updateSettings({ lunchMs: hhmmToMs(e.target.value) })
                      setSettings(await getSettings())
                    }} />
                  </div>
                  <div style={{flex:1}}>
                    <div className="small">Dormir</div>
                    <input type="time" value={msToHHMM(settings?.sleepMs ?? 0)} onChange={async e=>{
                      await updateSettings({ sleepMs: hhmmToMs(e.target.value) })
                      setSettings(await getSettings())
                    }} />
                  </div>
                </div>
              </fieldset>

              <div className="hr"></div>

              <fieldset>
                <legend>PIN do Modo Estrito</legend>
                <div className="small">Defina 4–8 dígitos. Guardar isso é sua responsabilidade.</div>
                <div className="row" style={{marginTop:8}}>
                  <input type="password" placeholder="Novo PIN (4–8 dígitos)" onChange={(e)=>setPin(e.target.value)} value={pin} />
                  <button className="btn ok" onClick={()=>setStrictPin(pin)}>SALVAR PIN</button>
                </div>
                <div className="small">{pinMsg}</div>
              </fieldset>

              <div style={{height:10}}/>
              <button className="bigbtn primary" onClick={enableStrict}>ATIVAR MODO ESTRITO</button>

              <div className="hr"></div>

              <fieldset>
                <legend>Backup criptografado (local)</legend>
                <div className="small">Exporta/Importa com senha. Se perder a senha, perdeu o backup.</div>
                <div className="row" style={{marginTop:8}}>
                  <input id="bp" type="password" placeholder="Senha do backup" />
                  <button className="btn" onClick={async ()=>{
                    const el = document.getElementById('bp') as HTMLInputElement
                    if (!el.value || el.value.length < 8) return alert('Senha mínima: 8 caracteres')
                    await exportEncrypted(el.value)
                    alert('Backup exportado.')
                  }}>EXPORTAR</button>
                </div>
                <div className="row" style={{marginTop:8}}>
                  <input id="bi" type="file" />
                  <button className="btn" onClick={async ()=>{
                    const passEl = document.getElementById('bp') as HTMLInputElement
                    const fileEl = document.getElementById('bi') as HTMLInputElement
                    const f = fileEl.files?.[0]
                    if (!f) return alert('Escolha um arquivo.')
                    if (!passEl.value) return alert('Informe a senha no campo acima.')
                    try{
                      await importEncrypted(f, passEl.value)
                      alert('Backup importado.')
                    } catch(e:any){
                      alert('Falhou: '+(e?.message ?? 'erro'))
                    }
                  }}>IMPORTAR</button>
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <h2>MODO ESTRITO</h2>
              <div className="small">Somente execução. Para sair: PIN.</div>
              <div className="row" style={{marginTop:8}}>
                <input type="password" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)} />
                <button className="btn" onClick={tryExitStrict}>SAIR</button>
              </div>
              <div className="small">{pinMsg}</div>

              <div className="hr"></div>
              <div className="small">Âncoras (fixas, mas ajustáveis no Admin):</div>
              <div className="row" style={{marginTop:8}}>
                <span className="pill">Acordar <span className="kbd">{msToHHMM(settings?.wakeMs ?? 0)}</span></span>
                <span className="pill">Almoço <span className="kbd">{msToHHMM(settings?.lunchMs ?? 0)}</span></span>
                <span className="pill">Dormir <span className="kbd">{msToHHMM(settings?.sleepMs ?? 0)}</span></span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
