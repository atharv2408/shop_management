import React, { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { auth, db } from '../../utils/firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'

const ToastContext = createContext()
export function useToast(){ return useContext(ToastContext) }

function ToastProvider({children}){
  const [toasts, setToasts] = useState([])
  function addToast(type, message){
    const id = Math.random().toString(36).slice(2,9)
    setToasts(s => [...s, {id,type,message}])
    setTimeout(()=> setToasts(s => s.filter(t=>t.id!==id)), 3000)
  }
  return (
    <ToastContext.Provider value={{addToast}}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-96 max-w-full">
        <AnimatePresence>
          {toasts.map(t=>(
            <motion.div key={t.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className={`shadow-lg rounded p-3 text-white ${t.type==='success'?'bg-green-500':t.type==='warning'?'bg-yellow-500 text-black':'bg-red-500'}`}>
              <div className="text-sm">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

const AuthContext = createContext()
export function useAuth(){ return useContext(AuthContext) }

function AuthProvider({children}){
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('superadmin')
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{
      if(u){ setUser(u); setRole('superadmin') } else { setUser(null); setRole(null) }
      setLoading(false)
    })
    return ()=> unsub()
  },[])
  async function login(email,password){ await signInWithEmailAndPassword(auth,email,password) }
  async function logout(){ await signOut(auth) }
  return <AuthContext.Provider value={{user,role,loading,login,logout}}>{children}</AuthContext.Provider>
}

function Navbar(){
  const { user, role, logout } = useAuth()
  return (
    <nav className="bg-white dark:bg-gray-900 shadow p-4 flex justify-between items-center">
      <div className="flex gap-4 items-center">
        <Link to="/" className="font-bold">Dashboard</Link>
        <Link to="/inventory">Inventory</Link>
        <Link to="/billing">Billing</Link>
        <Link to="/invoices">Invoices</Link>
        <Link to="/reports">Reports</Link>
        {role==='superadmin' && <Link to="/manage-users">Manage Users</Link>}
        {role==='superadmin' && <Link to="/manage-shops">Manage Shops</Link>}
        <Link to="/settings">Settings</Link>
      </div>
      <div className="flex items-center gap-4">
        {user?(
          <>
            <span className="text-sm text-gray-600 dark:text-gray-300">{role}</span>
            <button onClick={logout} className="text-red-500">Logout</button>
          </>
        ):(
          <Link to="/login" className="text-indigo-600">Login</Link>
        )}
      </div>
    </nav>
  )
}

function Dashboard(){ return <div className="p-6"><h2 className="text-2xl font-bold">Dashboard</h2></div> }
function Inventory(){ return <div className="p-6"><h2 className="text-2xl font-bold">Inventory</h2></div> }
function Billing(){ return <div className="p-6"><h2 className="text-2xl font-bold">Billing</h2></div> }
function Invoices(){ return <div className="p-6"><h2 className="text-2xl font-bold">Invoice History</h2></div> }
function Reports(){ return <div className="p-6"><h2 className="text-2xl font-bold">Reports</h2></div> }

function ManageUsers(){
  const { addToast } = useToast()
  const [usersList,setUsersList]=useState([]); const [loading,setLoading]=useState(true)
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [roleSel,setRoleSel]=useState('staff'); const [shopId,setShopId]=useState('')
  useEffect(()=>{ fetchUsers() },[])
  async function fetchUsers(){
    setLoading(true)
    try{
      const snap = await getDocs(collection(db,'users'))
      const arr=[]
      snap.forEach(d=>arr.push({id:d.id,...d.data()}))
      setUsersList(arr)
    }catch(e){ addToast('error','Failed to fetch users') }
    setLoading(false)
  }
  async function createUser(){
    if(!email||!password){ addToast('warning','Email and password required'); return }
    try{
      await addDoc(collection(db,'users'),{email,role:roleSel,shopId:shopId||null,status:'active',createdAt:new Date().toISOString()})
      addToast('success','User record created in Firestore')
      setEmail(''); setPassword(''); setShopId(''); setRoleSel('staff')
      fetchUsers()
    }catch(e){ addToast('error','Failed to create user record') }
  }
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">Create User</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded" />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="border p-2 rounded" />
          <select value={roleSel} onChange={e=>setRoleSel(e.target.value)} className="border p-2 rounded">
            <option value="staff">Shop Staff</option>
            <option value="shopadmin">Shop Admin</option>
          </select>
          <input value={shopId} onChange={e=>setShopId(e.target.value)} placeholder="Shop ID" className="border p-2 rounded" />
        </div>
        <p className="text-sm text-gray-500 mt-2">Note: Auth account creation requires server-side Admin SDK; this creates a Firestore record.</p>
        <div className="mt-3"><button onClick={createUser} className="bg-indigo-600 text-white px-4 py-2 rounded">Create User (Firestore)</button></div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h3 className="font-semibold mb-2">All Users</h3>
        {loading? <div>Loading...</div> : (
          <table className="w-full text-left border">
            <thead className="bg-gray-100 dark:bg-gray-700"><tr><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Shop</th><th className="p-2">Status</th></tr></thead>
            <tbody>
              {usersList.map(u=>(
                <tr key={u.id} className="border-t"><td className="p-2">{u.email}</td><td className="p-2">{u.role}</td><td className="p-2">{u.shopId||'-'}</td><td className="p-2">{u.status||'active'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ManageShops(){
  const { addToast } = useToast()
  const [shops,setShops]=useState([]); const [name,setName]=useState(''); const [loading,setLoading]=useState(true)
  useEffect(()=>{ fetchShops() },[])
  async function fetchShops(){ setLoading(true); try{ const snap = await getDocs(collection(db,'shops')); const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()})); setShops(arr)}catch(e){addToast('error','Failed to fetch shops')} setLoading(false) }
  async function createShop(){ if(!name){addToast('warning','Name required'); return} try{ await addDoc(collection(db,'shops'),{shopName:name,status:'active',createdAt:new Date().toISOString()}); addToast('success','Shop created'); setName(''); fetchShops() }catch(e){addToast('error','Failed to create shop')} }
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Shops</h2>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">Create Shop</h3>
        <div className="flex gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Shop name" className="border p-2 rounded flex-1" />
          <button onClick={createShop} className="bg-indigo-600 text-white px-4 py-2 rounded">Create</button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h3 className="font-semibold mb-2">All Shops</h3>
        {loading? <div>Loading...</div> : (
          <table className="w-full text-left border"><thead className="bg-gray-100 dark:bg-gray-700"><tr><th className="p-2">Shop</th><th className="p-2">Status</th></tr></thead><tbody>{shops.map(s=>(<tr key={s.id} className="border-t"><td className="p-2">{s.shopName}</td><td className="p-2">{s.status}</td></tr>))}</tbody></table>
        )}
      </div>
    </div>
  )
}

function Toggle({enabled,onToggle}){ return (<button onClick={onToggle} className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${enabled?'bg-indigo-600':'bg-gray-400 dark:bg-gray-600'}`}><motion.div layout transition={{type:'spring',stiffness:500,damping:30}} className={`w-6 h-6 bg-white rounded-full shadow-md ${enabled?'translate-x-6':'translate-x-0'}`}/></button>) }
function Settings(){
  const { addToast } = useToast()
  const [darkMode, setDarkMode] = useState(()=>{ try{ const s=localStorage.getItem('darkMode'); if(s!==null) return JSON.parse(s); return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches }catch{ return false } })
  useEffect(()=>{ document.documentElement.classList.toggle('dark', darkMode); localStorage.setItem('darkMode', JSON.stringify(darkMode)) },[darkMode])
  return (
    <div className="p-6 max-w-xl mx-auto text-gray-900 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded shadow">
          <span className="font-medium">🔈 Toast Sounds</span>
          <Toggle enabled={true} onToggle={()=>{}} />
        </div>
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded shadow">
          <span className="font-medium">🌗 Dark Mode</span>
          <Toggle enabled={false} onToggle={()=>{}} />
        </div>
      </div>
    </div>
  )
}

function Login(){
  const { login } = useAuth()
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const { addToast } = useToast(); const navigate = useNavigate()
  async function submit(e){ e.preventDefault(); try{ await login(email,password); addToast('success','Logged in'); navigate('/') }catch(e){ addToast('error','Login failed') } }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800">
      <form onSubmit={submit} className="bg-white dark:bg-gray-900 p-6 rounded shadow w-96">
        <h2 className="text-xl font-semibold mb-4">Login</h2>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded mb-2" />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 border rounded mb-2" />
        <div className="flex gap-2"><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">Login</button></div>
      </form>
    </div>
  )
}

export default function AppWithAdmin(){
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login/>} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/" element={<Dashboard/>} />
            <Route path="/inventory" element={<Inventory/>} />
            <Route path="/billing" element={<Billing/>} />
            <Route path="/invoices" element={<Invoices/>} />
            <Route path="/reports" element={<Reports/>} />
            <Route path="/manage-users" element={<ManageUsers/>} />
            <Route path="/manage-shops" element={<ManageShops/>} />
            <Route path="*" element={<Navigate to='/' replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </ToastProvider>
  )
}
