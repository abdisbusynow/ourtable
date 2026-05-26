import { useState, useMemo, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  getRestaurants, addRestaurant, updateRestaurant,
  deleteRestaurant, verifyPin, subscribeToRestaurants
} from './supabase'

// ─── Fix Leaflet default icon ────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const visitedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})
const wantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

// ─── Constants ───────────────────────────────────────────────────────────────
const CUISINES = ['All','Italian','Japanese','French','Indian','American','Vietnamese','Thai','Chinese','Mexican','Korean','Mediterranean','Other']

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  input: { width:'100%', padding:'10px 12px', background:'#f0ebe6', border:'1px solid #ddd5cb', borderRadius:'8px', fontSize:'14px', color:'#2d1f16', fontFamily:'inherit', boxSizing:'border-box', outline:'none' },
  btn: { padding:'11px 20px', borderRadius:'10px', border:'none', cursor:'pointer', fontSize:'14px', fontFamily:'inherit', fontWeight:500, transition:'opacity 0.15s' },
  label: { display:'block', fontSize:'11px', fontFamily:'Georgia, serif', fontStyle:'italic', color:'#9a8f85', marginBottom:'6px', letterSpacing:'0.04em' },
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const HeartIcon = ({ filled, size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)
const StarIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)
const MapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
)
const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const LockIcon = ({ open }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open
      ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
      : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>}
  </svg>
)
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const DiceIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="3"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const StarRating = ({ value, onChange, label }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
    {label && <span style={{ fontSize:'11px', color:'#9a8f85', fontFamily:'Georgia,serif', fontStyle:'italic', minWidth:48 }}>{label}</span>}
    <div style={{ display:'flex', gap:'2px' }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange && onChange(i)}
          style={{ background:'none', border:'none', cursor:onChange?'pointer':'default', padding:1, color:i<=value?'#c4704a':'#d9cfc9', transition:'color 0.15s' }}>
          <StarIcon filled={i<=value}/>
        </button>
      ))}
    </div>
  </div>
)

// ─── Modal wrapper ─────────────────────────────────────────────────────────
const Modal = ({ children, onClose, wide }) => (
  <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(30,20,14,0.55)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
    <div onClick={e=>e.stopPropagation()} style={{ background:'#faf7f4', borderRadius:'16px', padding:'32px', width:'100%', maxWidth:wide?680:480, boxShadow:'0 24px 60px rgba(30,20,14,0.2)', position:'relative', maxHeight:'90vh', overflowY:'auto' }}>
      <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor:'pointer', color:'#9a8f85', padding:4 }}><XIcon/></button>
      {children}
    </div>
  </div>
)

// ─── Geocode via Nominatim (free) ─────────────────────────────────────────
async function geocode(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: { 'Accept-Language': 'en' }
    })
    const data = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

// ─── Map auto-fit ──────────────────────────────────────────────────────────
function MapFitBounds({ restaurants }) {
  const map = useMap()
  useEffect(() => {
    const pts = restaurants.filter(r => r.lat && r.lng).map(r => [r.lat, r.lng])
    if (pts.length === 1) { map.setView(pts[0], 14) }
    else if (pts.length > 1) { map.fitBounds(pts, { padding: [40, 40] }) }
  }, [restaurants, map])
  return null
}

// ─── PIN Gate ──────────────────────────────────────────────────────────────
function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (pin.length < 4) return
    setLoading(true)
    const ok = await verifyPin(pin)
    setLoading(false)
    if (ok) { onSuccess() }
    else { setError('Wrong PIN. Try again.'); setPin('') }
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🔐</div>
        <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'22px', color:'#2d1f16', margin:'0 0 6px' }}>Edit Access</h2>
        <p style={{ fontSize:'13px', color:'#9a8f85', marginBottom:'24px', fontStyle:'italic' }}>Enter your shared PIN to add or edit restaurants.</p>
        <div style={{ display:'flex', gap:'10px', justifyContent:'center', marginBottom:'16px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:48, height:56, background:'#f0ebe6', border:`2px solid ${pin.length>i?'#c4704a':'#ddd5cb'}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontFamily:'Georgia,serif', color:'#2d1f16', transition:'border-color 0.2s' }}>
              {pin[i] ? '●' : ''}
            </div>
          ))}
        </div>
        {error && <p style={{ color:'#c4704a', fontSize:'13px', marginBottom:'12px' }}>{error}</p>}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', maxWidth:200, margin:'0 auto 16px' }}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) => (
            <button key={i} onClick={() => {
              if (k === '⌫') setPin(p => p.slice(0,-1))
              else if (k !== '' && pin.length < 4) { const np = pin + k; setPin(np); if (np.length === 4) setTimeout(() => {}, 0) }
            }} style={{ ...s.btn, background: k===''?'transparent':'#f0ebe6', color:'#2d1f16', padding:'14px', fontSize:'18px', borderRadius:10, visibility:k===''?'hidden':'visible' }}>
              {k}
            </button>
          ))}
        </div>
        <button onClick={handleSubmit} disabled={pin.length<4||loading} style={{ ...s.btn, background:'#c4704a', color:'white', width:'100%', opacity:pin.length<4?0.5:1 }}>
          {loading ? 'Checking…' : 'Unlock'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────
function AddEditModal({ restaurant, onSave, onClose }) {
  const blank = { name:'', cuisine:'Italian', location:'', address:'', status:'want-to-go', date_visited:'', rating_a:0, rating_b:0, note:'', lat:null, lng:null }
  const [form, setForm] = useState(restaurant || blank)
  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleGeocode = async () => {
    const q = form.address || form.name + ' ' + form.location
    if (!q.trim()) return
    setGeocoding(true)
    const coords = await geocode(q)
    setGeocoding(false)
    if (coords) { set('lat', coords.lat); set('lng', coords.lng) }
    else alert("Couldn't find that location. Try adding more detail to the address.")
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'22px', color:'#2d1f16', marginBottom:'24px', fontWeight:600 }}>
        {restaurant ? 'Edit Restaurant' : 'Add Restaurant'}
      </h2>
      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        <div>
          <label style={s.label}>Restaurant Name</label>
          <input style={s.input} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Sakura Ramen"/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <div>
            <label style={s.label}>Cuisine</label>
            <select style={s.input} value={form.cuisine} onChange={e=>set('cuisine',e.target.value)}>
              {CUISINES.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Status</label>
            <select style={s.input} value={form.status} onChange={e=>set('status',e.target.value)}>
              <option value="want-to-go">Want to Go</option>
              <option value="visited">Visited</option>
            </select>
          </div>
        </div>
        <div>
          <label style={s.label}>Area / Neighborhood</label>
          <input style={s.input} value={form.location} onChange={e=>set('location',e.target.value)} placeholder="e.g. Downtown, Midtown"/>
        </div>
        <div>
          <label style={s.label}>Full Address <span style={{ color:'#c4704a' }}>(for map pin)</span></label>
          <div style={{ display:'flex', gap:'8px' }}>
            <input style={{ ...s.input, flex:1 }} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="e.g. 123 Main St, New York"/>
            <button onClick={handleGeocode} style={{ ...s.btn, background:'#f0ebe6', color:'#5a4a40', whiteSpace:'nowrap', padding:'10px 14px', fontSize:'13px' }}>
              {geocoding ? '…' : form.lat ? '✓ Pinned' : 'Pin on Map'}
            </button>
          </div>
          {form.lat && <p style={{ fontSize:'11px', color:'#9a8f85', marginTop:'4px', fontStyle:'italic' }}>📍 {form.lat.toFixed(4)}, {form.lng.toFixed(4)}</p>}
        </div>
        {form.status==='visited' && (
          <>
            <div>
              <label style={s.label}>Date Visited</label>
              <input style={s.input} type="date" value={form.date_visited||''} onChange={e=>set('date_visited',e.target.value)}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <label style={s.label}>Ratings</label>
              <StarRating label="F" value={form.rating_a} onChange={v=>set('rating_a',v)}/>
              <StarRating label="K" value={form.rating_b} onChange={v=>set('rating_b',v)}/>
            </div>
          </>
        )}
        <div>
          <label style={s.label}>Note / Memory</label>
          <textarea style={{ ...s.input, height:'80px', resize:'none' }} value={form.note} onChange={e=>set('note',e.target.value)} placeholder="Any memory or reason to visit…"/>
        </div>
        <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
          <button onClick={onClose} style={{ ...s.btn, background:'#ede8e3', color:'#5a4a40', flex:1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving||!form.name.trim()} style={{ ...s.btn, background:'#c4704a', color:'white', flex:2, opacity:saving?0.7:1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Restaurant Card ───────────────────────────────────────────────────────
function Card({ r, onEdit, onDelete, onToggle, canEdit }) {
  const avgRating = r.rating_a && r.rating_b ? ((r.rating_a + r.rating_b)/2).toFixed(1) : null
  return (
    <div style={{ background:'white', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 12px rgba(30,20,14,0.06)', border:'1px solid #ede8e3', display:'flex', flexDirection:'column', gap:'12px', transition:'box-shadow 0.2s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 6px 24px rgba(30,20,14,0.12)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(30,20,14,0.06)'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1 }}>
          <span style={{ fontSize:'11px', fontFamily:'Georgia,serif', fontStyle:'italic', color:'#c4704a', letterSpacing:'0.06em' }}>{r.cuisine}</span>
          <h3 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'17px', color:'#2d1f16', margin:'2px 0 0', fontWeight:600 }}>{r.name}</h3>
          {r.location && <p style={{ fontSize:'12px', color:'#9a8f85', margin:'3px 0 0' }}>📍 {r.location}</p>}
          {r.lat && <p style={{ fontSize:'11px', color:'#b8afa8', margin:'2px 0 0' }}>🗺 on map</p>}
        </div>
        <button onClick={() => canEdit ? onToggle(r) : null}
          title={canEdit ? (r.status==='visited'?'Mark as want-to-go':'Mark as visited') : 'Unlock to edit'}
          style={{ background:'none', border:'none', cursor:canEdit?'pointer':'not-allowed', color:r.status==='visited'?'#c4704a':'#d9cfc9', padding:'4px', transition:'color 0.2s', marginLeft:'8px' }}>
          <HeartIcon filled={r.status==='visited'} size={20}/>
        </button>
      </div>
      {r.status==='visited' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          <StarRating label="F" value={r.rating_a}/>
          <StarRating label="K" value={r.rating_b}/>
          {avgRating && <span style={{ fontSize:'11px', color:'#9a8f85', fontStyle:'italic', marginTop:'2px' }}>avg {avgRating} ★</span>}
        </div>
      )}
      {r.note && <p style={{ fontSize:'13px', color:'#6b5a50', fontStyle:'italic', lineHeight:1.5, borderLeft:'2px solid #ede8e3', paddingLeft:'10px', margin:0 }}>"{r.note}"</p>}
      {r.date_visited && <p style={{ fontSize:'11px', color:'#b8afa8', margin:0 }}>{new Date(r.date_visited+'T00:00:00').toLocaleDateString('en-US',{ month:'long', day:'numeric', year:'numeric' })}</p>}
      {canEdit && (
        <div style={{ display:'flex', gap:'8px', borderTop:'1px solid #f0ebe6', paddingTop:'12px', marginTop:'4px' }}>
          <button onClick={()=>onEdit(r)} style={{ ...s.btn, background:'#f0ebe6', color:'#5a4a40', fontSize:'12px', padding:'7px 14px', flex:1 }}>Edit</button>
          <button onClick={()=>onDelete(r.id)} style={{ ...s.btn, background:'none', color:'#c4704a', fontSize:'12px', padding:'7px 14px', border:'1px solid #ede8e3' }}>Remove</button>
        </div>
      )}
    </div>
  )
}

// ─── Map View ──────────────────────────────────────────────────────────────
function MapView({ restaurants, canEdit, onEdit, onToggle }) {
  const mapped = restaurants.filter(r => r.lat && r.lng)
  const center = mapped.length > 0 ? [mapped[0].lat, mapped[0].lng] : [20, 0]
  return (
    <div style={{ position:'relative' }}>
      {mapped.length === 0 && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:500, background:'white', borderRadius:12, padding:'20px 28px', textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>🗺️</div>
          <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'15px', color:'#2d1f16', margin:0 }}>No places pinned yet.</p>
          <p style={{ fontSize:'12px', color:'#9a8f85', marginTop:'4px' }}>Add an address when editing a restaurant.</p>
        </div>
      )}
      <MapContainer center={center} zoom={4} style={{ height:'calc(100vh - 200px)', width:'100%', borderRadius:'0 0 0 0' }} zoomControl={true}>
        <TileLayer attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <MapFitBounds restaurants={mapped}/>
        {mapped.map(r => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={r.status==='visited' ? visitedIcon : wantIcon}>
            <Popup>
              <div style={{ fontFamily:'inherit', minWidth:160 }}>
                <p style={{ fontFamily:"Georgia,serif", fontStyle:'italic', color:'#c4704a', fontSize:'11px', margin:'0 0 2px' }}>{r.cuisine}</p>
                <strong style={{ fontSize:'15px', color:'#2d1f16' }}>{r.name}</strong>
                {r.location && <p style={{ fontSize:'12px', color:'#9a8f85', margin:'4px 0 0' }}>📍 {r.location}</p>}
                {r.note && <p style={{ fontSize:'12px', color:'#6b5a50', fontStyle:'italic', margin:'6px 0 0', borderLeft:'2px solid #ede8e3', paddingLeft:'8px' }}>"{r.note}"</p>}
                <div style={{ marginTop:'8px', display:'flex', gap:'6px' }}>
                  <span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:20, background:r.status==='visited'?'#fde8df':'#e8f0fe', color:r.status==='visited'?'#c4704a':'#4a6fc4' }}>
                    {r.status==='visited' ? '❤️ Visited' : '✨ Want to go'}
                  </span>
                  {canEdit && <button onClick={()=>onEdit(r)} style={{ fontSize:'11px', padding:'3px 8px', borderRadius:20, background:'#f0ebe6', border:'none', cursor:'pointer', color:'#5a4a40' }}>Edit</button>}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div style={{ position:'absolute', bottom:20, left:20, zIndex:500, background:'white', borderRadius:10, padding:'10px 14px', boxShadow:'0 2px 12px rgba(0,0,0,0.1)', display:'flex', gap:'14px', fontSize:'12px', color:'#5a4a40' }}>
        <span>🔴 Visited ({mapped.filter(r=>r.status==='visited').length})</span>
        <span>🔵 Want to Go ({mapped.filter(r=>r.status==='want-to-go').length})</span>
      </div>
    </div>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('all')
  const [cuisine, setCuisine] = useState('All')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('grid')          // 'grid' | 'map'
  const [canEdit, setCanEdit] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [surprise, setSurprise] = useState(null)

  // ── Load data ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await getRestaurants()
      setRestaurants(data)
    } catch (e) {
      setError('Could not connect to database. Check your Supabase config.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const channel = subscribeToRestaurants(() => load())
    return () => channel.unsubscribe()
  }, [load])

  // ── Filtered list ──────────────────────────────────────────────────────
  const filtered = useMemo(() => restaurants.filter(r => {
    if (tab==='visited' && r.status!=='visited') return false
    if (tab==='want-to-go' && r.status!=='want-to-go') return false
    if (cuisine!=='All' && r.cuisine!==cuisine) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.location.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [restaurants, tab, cuisine, search])

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const visited = restaurants.filter(r=>r.status==='visited')
    const withRatings = visited.filter(r=>r.rating_a&&r.rating_b)
    const avgA = withRatings.length ? (withRatings.reduce((s,r)=>s+r.rating_a,0)/withRatings.length).toFixed(1) : '—'
    const avgB = withRatings.length ? (withRatings.reduce((s,r)=>s+r.rating_b,0)/withRatings.length).toFixed(1) : '—'
    const cc = {}; visited.forEach(r=>{ cc[r.cuisine]=(cc[r.cuisine]||0)+1 })
    const top = Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]
    return { visited:visited.length, wantToGo:restaurants.filter(r=>r.status==='want-to-go').length, avgA, avgB, topCuisine:top?.[0]||'—' }
  }, [restaurants])

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSave = async (form) => {
    if (editing) {
      const updated = await updateRestaurant(editing.id, form)
      setRestaurants(rs => rs.map(r => r.id===editing.id ? updated : r))
      setEditing(null)
    } else {
      const created = await addRestaurant(form)
      setRestaurants(rs => [created, ...rs])
    }
  }

  const handleToggle = async (r) => {
    if (!canEdit) return
    const newStatus = r.status==='visited' ? 'want-to-go' : 'visited'
    const updated = await updateRestaurant(r.id, { status: newStatus })
    setRestaurants(rs => rs.map(x => x.id===r.id ? updated : x))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this restaurant?')) return
    await deleteRestaurant(id)
    setRestaurants(rs => rs.filter(r => r.id!==id))
  }

  const handleSurprise = () => {
    const pool = restaurants.filter(r=>r.status==='want-to-go')
    if (pool.length) setSurprise(pool[Math.floor(Math.random()*pool.length)])
  }

  const handleEditClick = (r) => {
    if (canEdit) setEditing(r)
    else setShowPin(true)
  }

  const handleAddClick = () => {
    if (canEdit) setShowAdd(true)
    else setShowPin(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#faf7f4', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:36 }}>🍽️</div>
      <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontStyle:'italic', color:'#9a8f85' }}>Setting the table…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#faf7f4', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, padding:24 }}>
      <div style={{ fontSize:36 }}>⚠️</div>
      <p style={{ fontFamily:"'Playfair Display',Georgia,serif", color:'#2d1f16', textAlign:'center' }}>{error}</p>
      <p style={{ fontSize:13, color:'#9a8f85', textAlign:'center' }}>Make sure you've set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env.local file.</p>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#faf7f4', fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover { opacity: 0.85; }
        input:focus, select:focus, textarea:focus { border-color: #c4704a !important; box-shadow: 0 0 0 3px rgba(196,112,74,0.12); }
        .leaflet-container { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background:'white', borderBottom:'1px solid #ede8e3', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:500 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <HeartIcon filled size={18}/>
            <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'20px', color:'#2d1f16', fontWeight:600 }}>Our Table</h1>
          </div>
          <p style={{ fontSize:'12px', color:'#9a8f85', marginTop:'2px', fontStyle:'italic' }}>a little food diary for two</p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <button onClick={() => canEdit ? setCanEdit(false) : setShowPin(true)}
            style={{ ...s.btn, background:canEdit?'#fde8df':'#f0ebe6', color:canEdit?'#c4704a':'#9a8f85', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', padding:'9px 14px' }}>
            <LockIcon open={canEdit}/> {canEdit ? 'Editing' : 'View Only'}
          </button>
          <button onClick={handleSurprise} style={{ ...s.btn, background:'#f0ebe6', color:'#5a4a40', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', padding:'9px 14px' }}>
            <DiceIcon/> Surprise Me
          </button>
          <button onClick={handleAddClick} style={{ ...s.btn, background:'#c4704a', color:'white', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', padding:'9px 14px' }}>
            <PlusIcon/> Add
          </button>
        </div>
      </header>

      {/* ── Stats Bar ── */}
      <div style={{ background:'#2d1f16', color:'white', padding:'14px 24px', display:'flex', gap:'28px', flexWrap:'wrap' }}>
        {[['Visited',stats.visited,'🍽️'],['Want to Go',stats.wantToGo,'✨'],['Fav Cuisine',stats.topCuisine,'🏆']].map(([label,val,emoji])=>(
          <div key={label}>
            <div style={{ fontSize:'10px', color:'#9a8f85', letterSpacing:'0.06em', fontStyle:'italic' }}>{emoji} {label}</div>
            <div style={{ fontSize:'17px', fontFamily:"'Playfair Display',Georgia,serif", fontWeight:600, marginTop:'2px' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ padding:'16px 24px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center', borderBottom:'1px solid #ede8e3', background:'white' }}>
        <div style={{ display:'flex', background:'#f0ebe6', borderRadius:'10px', padding:'3px', gap:'2px' }}>
          {[['all','All'],['visited','Visited ❤️'],['want-to-go','Want to Go ✨']].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)} style={{ ...s.btn, background:tab===v?'white':'transparent', color:tab===v?'#2d1f16':'#9a8f85', fontSize:'13px', padding:'7px 12px', boxShadow:tab===v?'0 1px 4px rgba(0,0,0,0.1)':'none' }}>{l}</button>
          ))}
        </div>
        <select value={cuisine} onChange={e=>setCuisine(e.target.value)} style={{ ...s.input, width:'auto', padding:'9px 12px', fontSize:'13px' }}>
          {CUISINES.map(c=><option key={c}>{c}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ ...s.input, flex:1, minWidth:'140px', padding:'9px 12px', fontSize:'13px' }}/>
        <div style={{ display:'flex', background:'#f0ebe6', borderRadius:'10px', padding:'3px', gap:'2px', marginLeft:'auto' }}>
          {[['grid',<GridIcon/>],['map',<MapIcon/>]].map(([v,icon])=>(
            <button key={v} onClick={()=>setView(v)} style={{ ...s.btn, background:view===v?'white':'transparent', color:view===v?'#2d1f16':'#9a8f85', padding:'7px 12px', display:'flex', alignItems:'center', gap:5, fontSize:'13px', boxShadow:view===v?'0 1px 4px rgba(0,0,0,0.1)':'none' }}>{icon} {v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {view==='map' ? (
        <MapView restaurants={filtered} canEdit={canEdit} onEdit={handleEditClick} onToggle={handleToggle}/>
      ) : (
        <main style={{ padding:'24px', maxWidth:'1100px', margin:'0 auto' }}>
          {filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#9a8f85' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🍽️</div>
              <p style={{ fontFamily:"'Playfair Display',Georgia,serif", fontStyle:'italic', fontSize:'16px' }}>Nothing here yet.</p>
              <p style={{ fontSize:'13px', marginTop:'6px' }}>Add your first restaurant or adjust the filters.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'16px' }}>
              {filtered.map(r=>(
                <Card key={r.id} r={r} canEdit={canEdit} onEdit={handleEditClick} onDelete={handleDelete} onToggle={handleToggle}/>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── Modals ── */}
      {showPin && <PinModal onSuccess={()=>{ setCanEdit(true); setShowPin(false) }} onClose={()=>setShowPin(false)}/>}

      {surprise && (
        <Modal onClose={()=>setSurprise(null)}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'36px', marginBottom:'12px' }}>🎲</div>
            <p style={{ fontFamily:'Georgia,serif', fontStyle:'italic', color:'#9a8f85', fontSize:'13px', marginBottom:'4px' }}>Tonight, you two should try…</p>
            <h2 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:'26px', color:'#2d1f16', margin:'0 0 6px' }}>{surprise.name}</h2>
            <p style={{ color:'#c4704a', fontSize:'13px', marginBottom:'4px' }}>{surprise.cuisine}</p>
            {surprise.location && <p style={{ color:'#9a8f85', fontSize:'13px' }}>📍 {surprise.location}</p>}
            {surprise.note && <p style={{ fontStyle:'italic', color:'#6b5a50', marginTop:'12px', fontSize:'14px' }}>"{surprise.note}"</p>}
            <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
              <button onClick={handleSurprise} style={{ ...s.btn, background:'#f0ebe6', color:'#5a4a40', flex:1 }}>Try Again</button>
              <button onClick={()=>setSurprise(null)} style={{ ...s.btn, background:'#c4704a', color:'white', flex:1 }}>Sounds Good!</button>
            </div>
          </div>
        </Modal>
      )}

      {(showAdd||editing) && canEdit && (
        <AddEditModal restaurant={editing} onSave={handleSave} onClose={()=>{ setShowAdd(false); setEditing(null) }}/>
      )}
    </div>
  )
}
