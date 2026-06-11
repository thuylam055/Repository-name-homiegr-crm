import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as XLSX from 'xlsx'
import { Users, LayoutDashboard, Briefcase, Gift, Wallet, UserPlus, Network, Download } from 'lucide-react'
import './styles.css'

const AREAS = ['Nam Sài Gòn','Trung Tâm','Đông Sài Gòn','Tây Sài Gòn','Bắc Sài Gòn','Quận 7','Nhà Bè','Quận 4','Bình Thạnh','Phú Nhuận','Gò Vấp','Tân Bình','Tân Phú','Thủ Đức','Khác']
const ROLES = ['Admin','HR','Kế toán','Leader','Sale']
const POSITIONS = ['Sale','Leader','HR','Admin','Kế toán']
const MONTH_NOW = new Date().toISOString().slice(0,7)

const blankData = () => ({ teams: [], staff: [], recruits: [], projects: [] })

function load(month) {
  return JSON.parse(localStorage.getItem('homie_crm_web_' + month) || JSON.stringify(blankData()))
}

function save(month, data) {
  localStorage.setItem('homie_crm_web_' + month, JSON.stringify(data))
}

function fmtDate(v) {
  if (!v) return ''
  const [y,m,d] = v.split('-')
  return d && m && y ? `${d}/${m}/${y}` : v
}

function money(n) {
  return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'
}

function prefixByPosition(position) {
  if (position === 'Leader') return 'LD'
  if (position === 'HR') return 'HR'
  if (position === 'Kế toán') return 'KT'
  if (position === 'Admin') return 'AD'
  return 'H'
}

function nextCode(list, prefix) {
  let max = 0
  list.forEach(item => {
    const code = item.code || ''
    if (code.startsWith(prefix)) {
      const n = parseInt(code.replace(prefix, ''), 10) || 0
      if (n > max) max = n
    }
  })
  return prefix + String(max + 1).padStart(2, '0')
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function App() {
  const [month, setMonth] = useState(localStorage.getItem('homie_crm_month') || MONTH_NOW)
  const [data, setData] = useState(() => load(localStorage.getItem('homie_crm_month') || MONTH_NOW))
  const [page, setPage] = useState('dashboard')
  const [role, setRole] = useState('Admin')
  const [areaFilter, setAreaFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [editing, setEditing] = useState({})
  const [staffForm, setStaffForm] = useState(emptyStaff())
  const [teamForm, setTeamForm] = useState(emptyTeam())
  const [recruitForm, setRecruitForm] = useState(emptyRecruit())
  const [projectForm, setProjectForm] = useState(emptyProject())

  function persist(next) {
    setData(next)
    save(month, next)
  }

  function changeMonth(newMonth, copyBase=false) {
    localStorage.setItem('homie_crm_month', newMonth)
    let next = load(newMonth)
    if (copyBase && next.staff.length === 0 && next.teams.length === 0) {
      next.teams = data.teams
      next.staff = data.staff.filter(s => s.status !== 'Nghỉ việc')
      next.recruits = []
      next.projects = []
      save(newMonth, next)
    }
    setMonth(newMonth)
    setData(next)
  }

  const filtered = useMemo(() => {
    const match = item => (!areaFilter || item.area === areaFilter) && (!teamFilter || item.team === teamFilter || item.name === teamFilter)
    return {
      teams: data.teams.filter(match),
      staff: data.staff.filter(match),
      recruits: data.recruits.filter(match),
      projects: data.projects.filter(match)
    }
  }, [data, areaFilter, teamFilter])

  function staffName(code) {
    const s = data.staff.find(x => x.code === code)
    return s ? `${s.fullName} (${s.code})` : code || ''
  }

  function saveTeamForm() {
    if (!teamForm.name.trim()) return alert('Nhập tên Team')
    const item = { ...teamForm, id: teamForm.id || uid() }
    const next = { ...data }
    next.teams = teamForm.id ? next.teams.map(x => x.id === item.id ? item : x) : [...next.teams, item]
    persist(next)
    setTeamForm(emptyTeam())
    setEditing({})
  }

  function saveStaffForm() {
    if (!staffForm.fullName.trim()) return alert('Nhập họ tên nhân sự')
    const manual = staffForm.code.trim()
    const prefix = prefixByPosition(staffForm.position)
    const code = manual || staffForm.oldCode || nextCode(data.staff, prefix)
    const duplicate = data.staff.find(x => x.code === code && x.code !== staffForm.oldCode)
    if (duplicate) return alert('Mã nhân viên đã tồn tại')
    const item = { ...staffForm, code, oldCode: undefined, id: staffForm.id || uid() }
    const next = { ...data }
    if (staffForm.oldCode && staffForm.oldCode !== code) {
      next.teams = next.teams.map(t => t.leaderCode === staffForm.oldCode ? { ...t, leaderCode: code } : t)
      next.recruits = next.recruits.map(r => r.recruiterCode === staffForm.oldCode ? { ...r, recruiterCode: code } : r)
      next.projects = next.projects.map(p => ({
        ...p,
        ownerCode: p.ownerCode === staffForm.oldCode ? code : p.ownerCode,
        closerCode: p.closerCode === staffForm.oldCode ? code : p.closerCode
      }))
    }
    next.staff = staffForm.id ? next.staff.map(x => x.id === item.id ? item : x) : [...next.staff, item]
    persist(next)
    setStaffForm(emptyStaff())
    setEditing({})
  }

  function saveRecruitForm() {
    if (!recruitForm.fullName.trim()) return alert('Nhập họ tên ứng viên')
    const item = { ...recruitForm, id: recruitForm.id || uid(), code: recruitForm.code || nextCode(data.recruits, 'UV') }
    const next = { ...data, recruits: recruitForm.id ? data.recruits.map(x => x.id === item.id ? item : x) : [...data.recruits, item] }
    persist(next)
    setRecruitForm(emptyRecruit())
    setEditing({})
  }

  function saveProjectForm() {
    if (!projectForm.name.trim()) return alert('Nhập tên dự án')
    const item = { ...projectForm, id: projectForm.id || uid(), code: projectForm.code || nextCode(data.projects, 'DA') }
    const next = { ...data, projects: projectForm.id ? data.projects.map(x => x.id === item.id ? item : x) : [...data.projects, item] }
    persist(next)
    setProjectForm(emptyProject())
    setEditing({})
  }

  function remove(type, id) {
    if (!confirm('Xóa dòng này?')) return
    const next = { ...data, [type]: data[type].filter(x => x.id !== id) }
    persist(next)
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.teams), 'Team')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.staff), 'Nhan su')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.recruits), 'Tuyen dung')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.projects), 'Du an')
    XLSX.writeFile(wb, `Quan_Ly_Noi_Bo_${month}.xlsx`)
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `backup_${month}.json`
    a.click()
  }

  const allowedPages = getAllowedPages(role)

  return (
    <div className="app">
      <aside>
        <div className="brand">QUẢN LÝ<br/>NỘI BỘ</div>
        <div className="brandSub">Homie Group CRM Web</div>

        <div className="sideBox">
          <label>Phân quyền</label>
          <select value={role} onChange={e => { setRole(e.target.value); setPage('dashboard') }}>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="sideBox">
          <label>Tháng báo cáo</label>
          <input type="month" value={month} onChange={e => changeMonth(e.target.value)} />
          <button className="whiteBtn" onClick={() => {
            const m = prompt('Nhập tháng mới dạng YYYY-MM', MONTH_NOW)
            if (m) changeMonth(m, confirm('Có mang theo Team và nhân sự đang làm sang tháng mới không?'))
          }}>Tạo tháng mới</button>
        </div>

        <div className="sideBox">
          <label>Lọc khu vực</label>
          <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
            <option value="">Tất cả khu vực</option>
            {AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>

        <div className="sideBox">
          <label>Lọc Team</label>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
            <option value="">Tất cả Team</option>
            {data.teams.map(t => <option key={t.id}>{t.name}</option>)}
          </select>
        </div>

        <nav>
          {allowedPages.map(p => <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => setPage(p.id)}>{p.icon}{p.name}</button>)}
        </nav>
      </aside>

      <main>
        <header>
          <div>
            <h1>{getPageName(page)}</h1>
            <p>Web CRM dùng lâu dài: phân quyền, lưu tháng, xuất Excel, có thể kết nối Supabase.</p>
          </div>
          <div className="headerActions">
            <button onClick={exportExcel}><Download size={16}/> Xuất Excel</button>
            <button onClick={exportBackup}>Backup JSON</button>
          </div>
        </header>

        {page === 'dashboard' && <Dashboard data={filtered} staffName={staffName} />}
        {page === 'teams' && <Teams data={data} filtered={filtered} form={teamForm} setForm={setTeamForm} saveForm={saveTeamForm} remove={remove} staffName={staffName} setEditing={setEditing} setTeamForm={setTeamForm} />}
        {page === 'staff' && <Staff data={data} filtered={filtered} form={staffForm} setForm={setStaffForm} saveForm={saveStaffForm} remove={remove} staffName={staffName} />}
        {page === 'recruits' && <Recruits data={data} filtered={filtered} form={recruitForm} setForm={setRecruitForm} saveForm={saveRecruitForm} remove={remove} staffName={staffName} />}
        {page === 'projects' && <Projects data={data} filtered={filtered} form={projectForm} setForm={setProjectForm} saveForm={saveProjectForm} remove={remove} staffName={staffName} />}
        {page === 'sourceReward' && <SourceReward projects={filtered.projects} staffName={staffName} />}
        {page === 'recruitReward' && <RecruitReward data={data} recruits={filtered.recruits} staffName={staffName} />}
      </main>
    </div>
  )
}

function emptyTeam(){ return { id:'', name:'', leaderCode:'', area:'', note:'' } }
function emptyStaff(){ return { id:'', oldCode:'', code:'', fullName:'', phone:'', dob:'', startDate:'', position:'Sale', staffType:'Full time', gender:'Nữ', team:'', leaderCode:'', area:'', salary:0, email:'', citizenId:'', endDate:'', status:'Đang làm', note:'' } }
function emptyRecruit(){ return { id:'', code:'', fullName:'', phone:'', source:'Facebook', recruiterCode:'', team:'', area:'', interviewDate:'', startDate:'', status:'Ứng viên mới', cost:0 } }
function emptyProject(){ return { id:'', code:'', name:'', area:'', team:'', ownerCode:'', closerCode:'', closeDate:'', saleCommission:0, companyAmount:0, status:'Đang xử lý' } }

function getAllowedPages(role) {
  const all = [
    { id:'dashboard', name:'Dashboard', icon:<LayoutDashboard size={17}/> , roles:ROLES },
    { id:'teams', name:'Quản lý Team', icon:<Network size={17}/>, roles:['Admin','HR','Leader'] },
    { id:'staff', name:'Nhân sự', icon:<Users size={17}/>, roles:['Admin','HR','Leader'] },
    { id:'recruits', name:'Tuyển dụng', icon:<UserPlus size={17}/>, roles:['Admin','HR'] },
    { id:'projects', name:'Dự án', icon:<Briefcase size={17}/>, roles:['Admin','Kế toán','Leader','Sale'] },
    { id:'sourceReward', name:'Thưởng nguồn', icon:<Wallet size={17}/>, roles:['Admin','Kế toán','Leader'] },
    { id:'recruitReward', name:'Thưởng tuyển dụng', icon:<Gift size={17}/>, roles:['Admin','HR'] }
  ]
  return all.filter(p => p.roles.includes(role))
}

function getPageName(page) {
  const map = { dashboard:'Dashboard', teams:'Quản lý Team', staff:'Nhân sự', recruits:'Tuyển dụng', projects:'Dự án', sourceReward:'Thưởng nguồn', recruitReward:'Thưởng tuyển dụng' }
  return map[page] || 'Dashboard'
}

function Dashboard({data}) {
  const closed = data.projects.filter(p => p.status === 'Đã chốt')
  const reward = closed.filter(p => p.ownerCode && p.closerCode && p.ownerCode !== p.closerCode).reduce((s,p) => s + Number(p.saleCommission)*.05 + Number(p.companyAmount)*.02, 0)
  return <div>
    <div className="stats">
      <Stat name="Tổng nhân sự" value={data.staff.length}/>
      <Stat name="Ứng viên" value={data.recruits.length}/>
      <Stat name="Dự án đã chốt" value={closed.length}/>
      <Stat name="Thưởng nguồn" value={money(reward)}/>
    </div>
    <section className="card">
      <h2>Báo cáo Team</h2>
      <Table headers={['Team','Nhân sự','Dự án','Đã chốt']} rows={data.teams.map(t => [
        t.name,
        data.staff.filter(s => s.team === t.name).length,
        data.projects.filter(p => p.team === t.name).length,
        data.projects.filter(p => p.team === t.name && p.status === 'Đã chốt').length
      ])}/>
    </section>
  </div>
}

function Stat({name,value}) { return <div className="stat"><span>{name}</span><b>{value}</b></div> }

function Teams({data, filtered, form, setForm, saveForm, remove, staffName, setTeamForm}) {
  return <div>
    <section className="card">
      <h2>{form.id ? 'Sửa Team' : 'Thêm Team'}</h2>
      <div className="grid">
        <Field label="Tên Team"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
        <Field label="Leader"><select value={form.leaderCode} onChange={e=>setForm({...form,leaderCode:e.target.value})}><option value="">-- Chọn --</option>{data.staff.map(s=><option key={s.id} value={s.code}>{s.fullName} ({s.code})</option>)}</select></Field>
        <Field label="Khu vực"><SelectArea value={form.area} onChange={area=>setForm({...form,area})}/></Field>
      </div>
      <div className="formActions"><button onClick={saveForm}>{form.id ? 'Cập nhật Team' : 'Lưu Team'}</button><button className="soft" onClick={()=>setForm(emptyTeam())}>Làm mới</button></div>
    </section>
    <section className="card">
      <h2>Danh sách Team</h2>
      <Table headers={['Team','Leader','Khu vực','Số nhân sự','Nhân sự trong Team','Hành động']} rows={filtered.teams.map(t => {
        const members = data.staff.filter(s => s.team === t.name)
        return [
          t.name, staffName(t.leaderCode), t.area, members.length,
          <div>{members.length ? members.map(s => <div key={s.id}>{s.code} - {s.fullName}</div>) : 'Chưa có'}</div>,
          <Actions onEdit={()=>setTeamForm(t)} onDelete={()=>remove('teams', t.id)}/>
        ]
      })}/>
    </section>
  </div>
}

function Staff({data, filtered, form, setForm, saveForm, remove, staffName}) {
  function chooseTeam(team) {
    const t = data.teams.find(x => x.name === team)
    setForm({...form, team, leaderCode: t?.leaderCode || form.leaderCode, area: t?.area || form.area})
  }
  return <div>
    <section className="card">
      <h2>{form.id ? 'Sửa nhân sự' : 'Thêm nhân sự'}</h2>
      <p className="hint">Mã NV: Sale H01 · Leader LD01 · HR HR01 · Kế toán KT01 · Admin AD01. Có thể nhập mã thủ công.</p>
      <div className="grid">
        <Field label="Mã NV"><input value={form.code} placeholder="Để trống sẽ tự tạo" onChange={e=>setForm({...form,code:e.target.value})}/></Field>
        <Field label="Họ tên"><input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></Field>
        <Field label="SĐT"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
        <Field label="Ngày sinh"><input type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})}/></Field>
        <Field label="Ngày vào làm"><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></Field>
        <Field label="Chức vụ"><select value={form.position} onChange={e=>setForm({...form,position:e.target.value})}>{POSITIONS.map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Loại nhân sự"><select value={form.staffType} onChange={e=>setForm({...form,staffType:e.target.value})}><option>Part time</option><option>Full time</option><option>Leader</option><option>Quản lý chi nhánh</option></select></Field>
        <Field label="Giới tính"><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option>Nữ</option><option>Nam</option><option>Khác</option></select></Field>
        <Field label="Team"><select value={form.team} onChange={e=>chooseTeam(e.target.value)}><option value="">-- Chọn --</option>{data.teams.map(t=><option key={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Leader quản lý"><select value={form.leaderCode} onChange={e=>setForm({...form,leaderCode:e.target.value})}><option value="">-- Chọn --</option>{data.staff.map(s=><option key={s.id} value={s.code}>{s.fullName} ({s.code})</option>)}</select></Field>
        <Field label="Khu vực"><SelectArea value={form.area} onChange={area=>setForm({...form,area})}/></Field>
        <Field label="Lương cơ bản"><input type="number" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/></Field>
        <Field label="Trạng thái"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Đang làm</option><option>Thử việc</option><option>Nghỉ việc</option></select></Field>
      </div>
      <div className="formActions"><button onClick={saveForm}>{form.id ? 'Cập nhật nhân sự' : 'Lưu nhân sự'}</button><button className="soft" onClick={()=>setForm(emptyStaff())}>Làm mới</button></div>
    </section>
    <section className="card">
      <h2>Danh sách nhân sự</h2>
      <Table headers={['Mã NV','Họ tên','SĐT','Chức vụ','Team','Khu vực','Leader','Ngày vào làm','Trạng thái','Hành động']} rows={filtered.staff.map(s => [
        s.code, s.fullName, s.phone, s.position, s.team, s.area, staffName(s.leaderCode), fmtDate(s.startDate), s.status,
        <Actions onEdit={()=>setForm({...s, oldCode:s.code})} onDelete={()=>remove('staff', s.id)}/>
      ])}/>
    </section>
  </div>
}

function Recruits({data, filtered, form, setForm, saveForm, remove, staffName}) {
  return <div>
    <section className="card">
      <h2>{form.id ? 'Sửa tuyển dụng' : 'Thêm tuyển dụng'}</h2>
      <div className="grid">
        <Field label="Họ tên ứng viên"><input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></Field>
        <Field label="SĐT"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
        <Field label="Nguồn"><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}><option>Facebook</option><option>Chợ Tốt</option><option>TikTok</option><option>Website</option><option>Người quen</option><option>Khác</option></select></Field>
        <Field label="Người tuyển"><select value={form.recruiterCode} onChange={e=>setForm({...form,recruiterCode:e.target.value})}><option value="">-- Chọn --</option>{data.staff.map(s=><option key={s.id} value={s.code}>{s.fullName} ({s.code})</option>)}</select></Field>
        <Field label="Team"><select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}><option value="">-- Chọn --</option>{data.teams.map(t=><option key={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Khu vực"><SelectArea value={form.area} onChange={area=>setForm({...form,area})}/></Field>
        <Field label="Ngày nhận việc"><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></Field>
        <Field label="Trạng thái"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Ứng viên mới</option><option>Đã phỏng vấn</option><option>Không phỏng vấn</option><option>Đã đi làm</option><option>Không đi làm</option></select></Field>
      </div>
      <div className="formActions"><button onClick={saveForm}>{form.id ? 'Cập nhật tuyển dụng' : 'Lưu tuyển dụng'}</button><button className="soft" onClick={()=>setForm(emptyRecruit())}>Làm mới</button></div>
    </section>
    <section className="card">
      <h2>Danh sách tuyển dụng</h2>
      <Table headers={['Mã UV','Ứng viên','SĐT','Nguồn','Người tuyển','Team','Ngày nhận việc','Trạng thái','Hành động']} rows={filtered.recruits.map(r => [
        r.code, r.fullName, r.phone, r.source, staffName(r.recruiterCode), r.team, fmtDate(r.startDate), r.status,
        <Actions onEdit={()=>setForm(r)} onDelete={()=>remove('recruits', r.id)}/>
      ])}/>
    </section>
  </div>
}

function Projects({data, filtered, form, setForm, saveForm, remove, staffName}) {
  return <div>
    <section className="card">
      <h2>{form.id ? 'Sửa dự án' : 'Thêm dự án'}</h2>
      <div className="grid">
        <Field label="Mã dự án"><input value={form.code} placeholder="Để trống tự tạo DA01" onChange={e=>setForm({...form,code:e.target.value})}/></Field>
        <Field label="Tên dự án"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
        <Field label="Khu vực"><SelectArea value={form.area} onChange={area=>setForm({...form,area})}/></Field>
        <Field label="Team"><select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}><option value="">-- Chọn --</option>{data.teams.map(t=><option key={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Sale lấy về"><select value={form.ownerCode} onChange={e=>setForm({...form,ownerCode:e.target.value})}><option value="">-- Chọn --</option>{data.staff.map(s=><option key={s.id} value={s.code}>{s.fullName} ({s.code})</option>)}</select></Field>
        <Field label="Sale chốt"><select value={form.closerCode} onChange={e=>setForm({...form,closerCode:e.target.value})}><option value="">-- Chọn --</option>{data.staff.map(s=><option key={s.id} value={s.code}>{s.fullName} ({s.code})</option>)}</select></Field>
        <Field label="Ngày chốt"><input type="date" value={form.closeDate} onChange={e=>setForm({...form,closeDate:e.target.value})}/></Field>
        <Field label="Hoa hồng sale chốt"><input type="number" value={form.saleCommission} onChange={e=>setForm({...form,saleCommission:e.target.value})}/></Field>
        <Field label="Phần công ty"><input type="number" value={form.companyAmount} onChange={e=>setForm({...form,companyAmount:e.target.value})}/></Field>
        <Field label="Trạng thái"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Đang xử lý</option><option>Đã chốt</option><option>Hủy</option></select></Field>
      </div>
      <div className="formActions"><button onClick={saveForm}>{form.id ? 'Cập nhật dự án' : 'Lưu dự án'}</button><button className="soft" onClick={()=>setForm(emptyProject())}>Làm mới</button></div>
    </section>
    <section className="card">
      <h2>Danh sách dự án</h2>
      <Table headers={['Mã DA','Dự án','Khu vực','Team','Sale lấy về','Sale chốt','Ngày chốt','Trạng thái','Hành động']} rows={filtered.projects.map(p => [
        p.code, p.name, p.area, p.team, staffName(p.ownerCode), staffName(p.closerCode), fmtDate(p.closeDate), p.status,
        <Actions onEdit={()=>setForm(p)} onDelete={()=>remove('projects', p.id)}/>
      ])}/>
    </section>
  </div>
}

function SourceReward({projects, staffName}) {
  const rows = projects.filter(p => p.status === 'Đã chốt' && p.ownerCode && p.closerCode && p.ownerCode !== p.closerCode).map(p => {
    const a = Number(p.saleCommission)*.05
    const b = Number(p.companyAmount)*.02
    return [p.name, staffName(p.ownerCode), staffName(p.closerCode), money(a), money(b), money(a+b)]
  })
  return <section className="card"><h2>Thưởng nguồn</h2><Table headers={['Dự án','Sale lấy về','Sale chốt','5% HH sale','2% công ty','Tổng']} rows={rows}/></section>
}

function RecruitReward({data, recruits, staffName}) {
  const rows = recruits.filter(r => r.status === 'Đã đi làm').map(r => {
    const staff = data.staff.find(s => s.phone === r.phone || s.fullName.toLowerCase() === r.fullName.toLowerCase())
    const deals = staff ? data.projects.filter(p => p.closerCode === staff.code && p.status === 'Đã chốt') : []
    return [r.fullName, staffName(r.recruiterCode), fmtDate(r.startDate), deals.length ? 'Có' : 'Chưa', deals.map(d => d.name).join(', '), deals.length ? 'Đủ điều kiện' : 'Chưa đủ']
  })
  return <section className="card"><h2>Thưởng tuyển dụng</h2><Table headers={['Nhân sự mới','Người tuyển','Ngày nhận việc','Có cọc/chốt?','Dự án','Trạng thái']} rows={rows}/></section>
}

function Field({label, children}) { return <div><label>{label}</label>{children}</div> }

function SelectArea({value, onChange}) {
  return <select value={value} onChange={e=>onChange(e.target.value)}><option value="">-- Chọn --</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select>
}

function Actions({onEdit,onDelete}) {
  return <div className="rowActions"><button className="blue" onClick={onEdit}>Sửa</button><button className="red" onClick={onDelete}>Xóa</button></div>
}

function Table({headers, rows}) {
  if (!rows.length) return <div className="empty">Chưa có dữ liệu.</div>
  return <div className="tableWrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
}

createRoot(document.getElementById('root')).render(<App />)
