import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as XLSX from 'xlsx'
import { supabase, hasSupabase } from './lib/supabase'
import './styles.css'

const AREAS = ['Nam Sài Gòn','Trung Tâm','Đông Sài Gòn','Tây Sài Gòn','Bắc Sài Gòn','Quận 7','Nhà Bè','Quận 4','Bình Thạnh','Phú Nhuận','Gò Vấp','Tân Bình','Tân Phú','Thủ Đức','Khác']
const STAFF_POSITIONS = ['Sale','Leader','HR','Admin','Kế toán']
const MODULES = [
  ['dashboard','Dashboard'],
  ['teams','Team'],
  ['staffs','Nhân sự'],
  ['recruitments','Tuyển dụng'],
  ['landlords','Chủ nhà'],
  ['projects','Dự án'],
  ['deposits','Báo cọc'],
  ['transactions','GDTC'],
  ['source_rewards','Thưởng nguồn'],
  ['audit_logs','Nhật ký']
]
const initial = { teams: [], staffs: [], recruitments: [], landlords: [], projects: [], deposits: [], transactions: [], source_rewards: [], audit_logs: [] }
const emptyForms = {
  teams: { team_code:'', team_name:'', leader_code:'', area:'', note:'' },
  staffs: { staff_code:'', full_name:'', phone:'', birthday:'', join_date:'', position:'Sale', employment_type:'Full Time', team_name:'', leader_code:'', area:'', base_salary:0, status:'Đang làm', note:'' },
  recruitments: { recruit_code:'', candidate_name:'', phone:'', source:'Facebook', recruiter_code:'', interview_date:'', start_work_date:'', status:'Chưa PV', note:'' },
  landlords: { owner_name:'', phone:'', property_count:0, staff_code:'', cooperation_status:'Đang hợp tác', note:'' },
  projects: { project_code:'', project_name:'', address:'', landlord_name:'', source_staff_code:'', source_date:'', area:'', status:'Đang xử lý', note:'' },
  deposits: { deposit_code:'', project_name:'', sale_code:'', customer_name:'', rent_price:0, deposit_amount:0, deposit_date:'', status:'Đã báo cọc', note:'' },
  transactions: { transaction_code:'', project_name:'', sale_code:'', customer_name:'', revenue:0, commission:0, transaction_date:'', status:'Đã GDTC', note:'' },
  source_rewards: { project_name:'', source_staff_code:'', closing_staff_code:'', source_date:'', closing_date:'', reward_amount:100000, payment_status:'Chưa thanh toán', note:'' },
  audit_logs: { user_name:'Admin', action_type:'', module_name:'', record_id:'', description:'' }
}

function key(t){ return 'homie_final_' + t }
function localLoad(t){ return JSON.parse(localStorage.getItem(key(t)) || '[]') }
function localSave(t,rows){ localStorage.setItem(key(t), JSON.stringify(rows)) }
function money(n){ return (Number(n)||0).toLocaleString('vi-VN') + 'đ' }
function fmtDate(v){ if(!v)return ''; const [y,m,d]=String(v).split('-'); return y&&m&&d ? `${d}/${m}/${y}` : v }
function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function prefixByPosition(pos){ if(pos==='Leader')return'LD'; if(pos==='HR')return'HR'; if(pos==='Kế toán')return'KT'; if(pos==='Admin')return'AD'; return'H' }
function nextCode(rows, field, prefix){ let max=0; rows.forEach(r=>{const c=String(r[field]||''); if(c.startsWith(prefix)){const n=parseInt(c.replace(prefix,''),10)||0; if(n>max)max=n}}); return prefix + String(max+1).padStart(2,'0') }

async function loadTable(table){
  if(hasSupabase){
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending:false })
    if(error){ alert('Lỗi tải ' + table + ': ' + error.message); return [] }
    return data || []
  }
  return localLoad(table)
}
async function saveRow(table,row,stateRows){
  if(hasSupabase){
    if(row.id){
      const { data, error } = await supabase.from(table).update(row).eq('id', row.id).select()
      if(error) throw error
      return data?.[0]
    }
    const { data, error } = await supabase.from(table).insert(row).select()
    if(error) throw error
    return data?.[0]
  }
  if(row.id){ const next=stateRows.map(x=>x.id===row.id?row:x); localSave(table,next); return row }
  const item={...row,id:uid(),created_at:new Date().toISOString()}; localSave(table,[item,...stateRows]); return item
}
async function deleteRow(table,id,rows){
  if(hasSupabase){ const { error } = await supabase.from(table).delete().eq('id', id); if(error) throw error; return }
  localSave(table, rows.filter(x=>x.id!==id))
}

function App(){
  const [page,setPage] = useState('dashboard')
  const [rows,setRows] = useState(initial)
  const [forms,setForms] = useState(emptyForms)
  const [loading,setLoading] = useState(false)
  const [search,setSearch] = useState('')
  const [areaFilter,setAreaFilter] = useState('')
  const [teamFilter,setTeamFilter] = useState('')

  async function refresh(){
    setLoading(true)
    const next = {}
    for(const key of Object.keys(initial)) next[key] = await loadTable(key)
    setRows(next); setLoading(false)
  }
  useEffect(()=>{ refresh() },[])

  function staffName(code){ const s=rows.staffs.find(x=>x.staff_code===code); return s ? `${s.full_name} (${s.staff_code})` : code || '' }
  function updateForm(table, patch){ setForms(prev=>({...prev, [table]: {...prev[table], ...patch}})) }

  async function writeAudit(action, table, record, desc){
    const log = { user_name:'Admin', action_type:action, module_name:table, record_id:record || '', description:desc }
    const saved = await saveRow('audit_logs', log, rows.audit_logs)
    setRows(prev=>({...prev, audit_logs:[saved, ...prev.audit_logs]}))
  }

  async function handleSave(table){
    try{
      let form = {...forms[table]}
      if(table==='staffs'){
        if(!form.full_name)return alert('Nhập họ tên nhân sự')
        if(!form.staff_code) form.staff_code = nextCode(rows.staffs,'staff_code',prefixByPosition(form.position))
        if(rows.staffs.find(x=>x.staff_code===form.staff_code && x.id!==form.id)) return alert('Mã NV đã tồn tại')
      }
      if(table==='teams'){ if(!form.team_name)return alert('Nhập tên Team'); if(!form.team_code) form.team_code=nextCode(rows.teams,'team_code','T') }
      if(table==='recruitments'){ if(!form.candidate_name)return alert('Nhập tên ứng viên'); if(!form.recruit_code) form.recruit_code=nextCode(rows.recruitments,'recruit_code','UV') }
      if(table==='landlords' && !form.owner_name)return alert('Nhập tên chủ nhà')
      if(table==='projects'){ if(!form.project_name)return alert('Nhập tên dự án'); if(!form.project_code)form.project_code=nextCode(rows.projects,'project_code','DA') }
      if(table==='deposits' && !form.deposit_code)form.deposit_code=nextCode(rows.deposits,'deposit_code','C')
      if(table==='transactions' && !form.transaction_code)form.transaction_code=nextCode(rows.transactions,'transaction_code','GD')
      if(table==='source_rewards'){ if(!form.project_name)return alert('Nhập dự án'); form.reward_amount=Number(form.reward_amount||100000) }
      const isEdit = Boolean(form.id)
      const saved = await saveRow(table, form, rows[table])
      const nextRows = form.id ? rows[table].map(x=>x.id===saved.id?saved:x) : [saved, ...rows[table]]
      setRows(prev=>({...prev, [table]: nextRows}))
      setForms(prev=>({...prev, [table]: emptyForms[table]}))
      await writeAudit(isEdit?'Sửa':'Thêm', table, saved.id, `${isEdit?'Sửa':'Thêm'} dữ liệu ${table}`)
    }catch(e){ alert('Lỗi lưu dữ liệu: ' + e.message) }
  }
  async function handleDelete(table,id){
    if(!confirm('Xóa dòng này?'))return
    try{ await deleteRow(table,id,rows[table]); setRows(prev=>({...prev,[table]:prev[table].filter(x=>x.id!==id)})); await writeAudit('Xóa', table, id, `Xóa dữ liệu ${table}`) }catch(e){ alert('Lỗi xóa: '+e.message) }
  }
  function handleEdit(table,row){ setForms(prev=>({...prev,[table]:row})); setPage(table); window.scrollTo({top:0,behavior:'smooth'}) }
  function exportExcel(){ const wb=XLSX.utils.book_new(); Object.entries(rows).forEach(([n,d])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(d),n)); XLSX.writeFile(wb,'Homie_CRM_Hoan_Chinh.xlsx') }

  const filtered = useMemo(()=>{
    const list = rows[page] || []
    const q = search.toLowerCase()
    return list.filter(r => (!q || JSON.stringify(r).toLowerCase().includes(q)) && (!areaFilter || r.area===areaFilter) && (!teamFilter || r.team_name===teamFilter))
  },[rows,page,search,areaFilter,teamFilter])

  return <div className="app">
    <aside>
      <div className="brand">QUẢN LÝ<br/>NỘI BỘ</div>
      <div className="brandSub">Homie CRM hoàn chỉnh · {hasSupabase ? 'Supabase Online' : 'Local Demo'}</div>
      <div className="sideBox"><label>Tìm kiếm</label><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm nhanh..."/></div>
      <div className="sideBox"><label>Lọc khu vực</label><select value={areaFilter} onChange={e=>setAreaFilter(e.target.value)}><option value="">Tất cả</option>{AREAS.map(a=><option key={a}>{a}</option>)}</select></div>
      <div className="sideBox"><label>Lọc Team</label><select value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}><option value="">Tất cả</option>{rows.teams.map(t=><option key={t.id}>{t.team_name}</option>)}</select></div>
      <nav>{MODULES.map(([id,name])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}>{name}</button>)}</nav>
    </aside>
    <main>
      <header><div><h1>{MODULES.find(x=>x[0]===page)?.[1]}</h1><p>{loading?'Đang tải dữ liệu...':hasSupabase?'Dữ liệu đang lưu online trên Supabase.':'Chưa cấu hình Supabase, dữ liệu đang lưu trên trình duyệt.'}</p></div><div className="headerActions"><button onClick={refresh}>Tải lại</button><button onClick={exportExcel}>Xuất Excel</button></div></header>
      {page==='dashboard' ? <Dashboard rows={rows}/> : <ModulePage table={page} rows={filtered} allRows={rows} form={forms[page]} updateForm={updateForm} save={()=>handleSave(page)} edit={handleEdit} del={handleDelete} staffName={staffName}/>}
    </main>
  </div>
}

function Dashboard({rows}){ 
  const totalRevenue=rows.transactions.reduce((s,x)=>s+Number(x.revenue||0),0)
  const totalCommission=rows.transactions.reduce((s,x)=>s+Number(x.commission||0),0)
  const totalDeposit=rows.deposits.reduce((s,x)=>s+Number(x.deposit_amount||0),0)
  const totalReward=rows.source_rewards.reduce((s,x)=>s+Number(x.reward_amount||0),0)
  return <div className="stats">
    <Stat name="Nhân sự" value={rows.staffs.length}/><Stat name="Team" value={rows.teams.length}/><Stat name="Chủ nhà" value={rows.landlords.length}/><Stat name="Dự án" value={rows.projects.length}/>
    <Stat name="Tổng cọc" value={money(totalDeposit)}/><Stat name="GDTC" value={rows.transactions.length}/><Stat name="Doanh thu" value={money(totalRevenue)}/><Stat name="Hoa hồng" value={money(totalCommission)}/><Stat name="Thưởng nguồn" value={money(totalReward)}/>
  </div> 
}
function Stat({name,value}){return <div className="stat"><span>{name}</span><b>{value}</b></div>}
function Field({label,children}){return <div><label>{label}</label>{children}</div>}
function SelectArea({value,onChange}){return <select value={value||''} onChange={e=>onChange(e.target.value)}><option value="">-- Chọn --</option>{AREAS.map(a=><option key={a}>{a}</option>)}</select>}
function StaffSelect({allRows,value,onChange}){return <select value={value||''} onChange={e=>onChange(e.target.value)}><option value="">-- Chọn --</option>{allRows.staffs.map(s=><option key={s.id} value={s.staff_code}>{s.full_name} ({s.staff_code})</option>)}</select>}
function TeamSelect({allRows,value,onChange}){return <select value={value||''} onChange={e=>onChange(e.target.value)}><option value="">-- Chọn --</option>{allRows.teams.map(t=><option key={t.id}>{t.team_name}</option>)}</select>}
function LandlordSelect({allRows,value,onChange}){return <select value={value||''} onChange={e=>onChange(e.target.value)}><option value="">-- Chọn --</option>{allRows.landlords.map(l=><option key={l.id}>{l.owner_name}</option>)}</select>}
function ProjectSelect({allRows,value,onChange}){return <select value={value||''} onChange={e=>onChange(e.target.value)}><option value="">-- Chọn --</option>{allRows.projects.map(p=><option key={p.id}>{p.project_name}</option>)}</select>}

function ModulePage({table,rows,allRows,form,updateForm,save,edit,del,staffName}){return <div><section className="card"><h2>{form?.id?'Sửa':'Thêm'} {title(table)}</h2><Form table={table} form={form} update={(p)=>updateForm(table,p)} allRows={allRows}/>{table!=='audit_logs'&&<div className="formActions"><button onClick={save}>{form?.id?'Cập nhật':'Thêm mới'}</button><button className="soft" onClick={()=>updateForm(table, emptyForms[table])}>Làm mới</button></div>}</section><section className="card"><h2>Danh sách {title(table)}</h2><DataTable table={table} rows={rows} edit={r=>edit(table,r)} del={id=>del(table,id)} staffName={staffName}/></section></div>}
function title(t){return {teams:'Team',staffs:'nhân sự',recruitments:'tuyển dụng',landlords:'chủ nhà',projects:'dự án',deposits:'báo cọc',transactions:'GDTC',source_rewards:'thưởng nguồn',audit_logs:'nhật ký'}[t]}

function Form({table,form,update,allRows}){
 if(table==='teams') return <div className="grid"><Field label="Mã Team"><input value={form.team_code||''} onChange={e=>update({team_code:e.target.value})} placeholder="Tự động T01"/></Field><Field label="Tên Team"><input value={form.team_name||''} onChange={e=>update({team_name:e.target.value})}/></Field><Field label="Leader"><StaffSelect allRows={allRows} value={form.leader_code} onChange={v=>update({leader_code:v})}/></Field><Field label="Khu vực"><SelectArea value={form.area} onChange={v=>update({area:v})}/></Field><Field label="Ghi chú"><input value={form.note||''} onChange={e=>update({note:e.target.value})}/></Field></div>
 if(table==='staffs') return <div className="grid"><Field label="Mã NV"><input value={form.staff_code||''} onChange={e=>update({staff_code:e.target.value})} placeholder="H01, H02... hoặc tự nhập"/></Field><Field label="Họ tên"><input value={form.full_name||''} onChange={e=>update({full_name:e.target.value})}/></Field><Field label="SĐT"><input value={form.phone||''} onChange={e=>update({phone:e.target.value})}/></Field><Field label="Ngày sinh"><input type="date" value={form.birthday||''} onChange={e=>update({birthday:e.target.value})}/></Field><Field label="Ngày vào làm"><input type="date" value={form.join_date||''} onChange={e=>update({join_date:e.target.value})}/></Field><Field label="Chức vụ"><select value={form.position||'Sale'} onChange={e=>update({position:e.target.value})}>{STAFF_POSITIONS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Loại nhân sự"><select value={form.employment_type||'Full Time'} onChange={e=>update({employment_type:e.target.value})}><option>Full Time</option><option>Part Time</option></select></Field><Field label="Team"><TeamSelect allRows={allRows} value={form.team_name} onChange={v=>{const t=allRows.teams.find(x=>x.team_name===v);update({team_name:v,leader_code:t?.leader_code||form.leader_code,area:t?.area||form.area})}}/></Field><Field label="Leader"><StaffSelect allRows={allRows} value={form.leader_code} onChange={v=>update({leader_code:v})}/></Field><Field label="Khu vực"><SelectArea value={form.area} onChange={v=>update({area:v})}/></Field><Field label="Lương cơ bản"><input type="number" value={form.base_salary||0} onChange={e=>update({base_salary:e.target.value})}/></Field><Field label="Trạng thái"><select value={form.status||'Đang làm'} onChange={e=>update({status:e.target.value})}><option>Đang làm</option><option>Nghỉ việc</option><option>Tạm nghỉ</option></select></Field></div>
 if(table==='recruitments') return <div className="grid"><Field label="Mã UV"><input value={form.recruit_code||''} onChange={e=>update({recruit_code:e.target.value})} placeholder="Tự động UV01"/></Field><Field label="Ứng viên"><input value={form.candidate_name||''} onChange={e=>update({candidate_name:e.target.value})}/></Field><Field label="SĐT"><input value={form.phone||''} onChange={e=>update({phone:e.target.value})}/></Field><Field label="Nguồn"><select value={form.source||'Facebook'} onChange={e=>update({source:e.target.value})}><option>Facebook</option><option>Chợ Tốt</option><option>TikTok</option><option>Người quen</option><option>Khác</option></select></Field><Field label="Người tuyển"><StaffSelect allRows={allRows} value={form.recruiter_code} onChange={v=>update({recruiter_code:v})}/></Field><Field label="Ngày PV"><input type="date" value={form.interview_date||''} onChange={e=>update({interview_date:e.target.value})}/></Field><Field label="Ngày nhận việc"><input type="date" value={form.start_work_date||''} onChange={e=>update({start_work_date:e.target.value})}/></Field><Field label="Trạng thái"><select value={form.status||'Chưa PV'} onChange={e=>update({status:e.target.value})}><option>Chưa PV</option><option>Đã PV</option><option>Đi làm</option><option>Nghỉ</option></select></Field></div>
 if(table==='landlords') return <div className="grid"><Field label="Tên chủ nhà"><input value={form.owner_name||''} onChange={e=>update({owner_name:e.target.value})}/></Field><Field label="SĐT"><input value={form.phone||''} onChange={e=>update({phone:e.target.value})}/></Field><Field label="Số căn"><input type="number" value={form.property_count||0} onChange={e=>update({property_count:e.target.value})}/></Field><Field label="Sale quản lý"><StaffSelect allRows={allRows} value={form.staff_code} onChange={v=>update({staff_code:v})}/></Field><Field label="Trạng thái hợp tác"><select value={form.cooperation_status||'Đang hợp tác'} onChange={e=>update({cooperation_status:e.target.value})}><option>Đang hợp tác</option><option>Ngưng hợp tác</option><option>Tiềm năng</option></select></Field><Field label="Ghi chú"><input value={form.note||''} onChange={e=>update({note:e.target.value})}/></Field></div>
 if(table==='projects') return <div className="grid"><Field label="Mã dự án"><input value={form.project_code||''} onChange={e=>update({project_code:e.target.value})} placeholder="Tự động DA01"/></Field><Field label="Tên dự án"><input value={form.project_name||''} onChange={e=>update({project_name:e.target.value})}/></Field><Field label="Địa chỉ"><input value={form.address||''} onChange={e=>update({address:e.target.value})}/></Field><Field label="Chủ nhà"><LandlordSelect allRows={allRows} value={form.landlord_name} onChange={v=>update({landlord_name:v})}/></Field><Field label="Sale lấy dự án"><StaffSelect allRows={allRows} value={form.source_staff_code} onChange={v=>update({source_staff_code:v})}/></Field><Field label="Ngày lấy về"><input type="date" value={form.source_date||''} onChange={e=>update({source_date:e.target.value})}/></Field><Field label="Khu vực"><SelectArea value={form.area} onChange={v=>update({area:v})}/></Field><Field label="Trạng thái"><select value={form.status||'Đang xử lý'} onChange={e=>update({status:e.target.value})}><option>Đang xử lý</option><option>Đã chốt</option><option>Hủy</option></select></Field></div>
 if(table==='deposits') return <div className="grid"><Field label="Mã cọc"><input value={form.deposit_code||''} onChange={e=>update({deposit_code:e.target.value})} placeholder="Tự động C01"/></Field><Field label="Dự án"><ProjectSelect allRows={allRows} value={form.project_name} onChange={v=>update({project_name:v})}/></Field><Field label="Sale chốt"><StaffSelect allRows={allRows} value={form.sale_code} onChange={v=>update({sale_code:v})}/></Field><Field label="Khách thuê"><input value={form.customer_name||''} onChange={e=>update({customer_name:e.target.value})}/></Field><Field label="Giá thuê"><input type="number" value={form.rent_price||0} onChange={e=>update({rent_price:e.target.value})}/></Field><Field label="Tiền cọc"><input type="number" value={form.deposit_amount||0} onChange={e=>update({deposit_amount:e.target.value})}/></Field><Field label="Ngày cọc"><input type="date" value={form.deposit_date||''} onChange={e=>update({deposit_date:e.target.value})}/></Field><Field label="Trạng thái"><select value={form.status||'Đã báo cọc'} onChange={e=>update({status:e.target.value})}><option>Đã báo cọc</option><option>Kế toán xác nhận</option><option>Hủy</option></select></Field></div>
 if(table==='transactions') return <div className="grid"><Field label="Mã GDTC"><input value={form.transaction_code||''} onChange={e=>update({transaction_code:e.target.value})} placeholder="Tự động GD01"/></Field><Field label="Dự án"><ProjectSelect allRows={allRows} value={form.project_name} onChange={v=>update({project_name:v})}/></Field><Field label="Sale chốt"><StaffSelect allRows={allRows} value={form.sale_code} onChange={v=>update({sale_code:v})}/></Field><Field label="Khách thuê"><input value={form.customer_name||''} onChange={e=>update({customer_name:e.target.value})}/></Field><Field label="Doanh thu"><input type="number" value={form.revenue||0} onChange={e=>update({revenue:e.target.value})}/></Field><Field label="Hoa hồng"><input type="number" value={form.commission||0} onChange={e=>update({commission:e.target.value})}/></Field><Field label="Ngày GDTC"><input type="date" value={form.transaction_date||''} onChange={e=>update({transaction_date:e.target.value})}/></Field><Field label="Trạng thái"><select value={form.status||'Đã GDTC'} onChange={e=>update({status:e.target.value})}><option>Đã GDTC</option><option>Đã thanh toán HH</option><option>Hủy</option></select></Field></div>
 if(table==='source_rewards') return <div className="grid"><Field label="Dự án"><ProjectSelect allRows={allRows} value={form.project_name} onChange={v=>{const p=allRows.projects.find(x=>x.project_name===v);update({project_name:v,source_staff_code:p?.source_staff_code||form.source_staff_code,source_date:p?.source_date||form.source_date})}}/></Field><Field label="Người lấy nguồn"><StaffSelect allRows={allRows} value={form.source_staff_code} onChange={v=>update({source_staff_code:v})}/></Field><Field label="Người chốt"><StaffSelect allRows={allRows} value={form.closing_staff_code} onChange={v=>update({closing_staff_code:v})}/></Field><Field label="Ngày lấy về"><input type="date" value={form.source_date||''} onChange={e=>update({source_date:e.target.value})}/></Field><Field label="Ngày chốt"><input type="date" value={form.closing_date||''} onChange={e=>update({closing_date:e.target.value})}/></Field><Field label="Tiền thưởng"><input type="number" value={form.reward_amount||100000} onChange={e=>update({reward_amount:e.target.value})}/></Field><Field label="Trạng thái"><select value={form.payment_status||'Chưa thanh toán'} onChange={e=>update({payment_status:e.target.value})}><option>Chưa thanh toán</option><option>Đã thanh toán</option></select></Field></div>
 if(table==='audit_logs') return <div className="empty">Nhật ký tự động ghi lại khi thêm, sửa, xóa dữ liệu.</div>
}

function DataTable({table,rows,edit,del,staffName}){
 if(!rows.length)return <div className="empty">Chưa có dữ liệu.</div>
 const configs={
  teams:[['Mã Team','team_code'],['Tên Team','team_name'],['Leader','leader_code','staff'],['Khu vực','area']],
  staffs:[['Mã NV','staff_code'],['Họ tên','full_name'],['SĐT','phone'],['Chức vụ','position'],['Team','team_name'],['Leader','leader_code','staff'],['Khu vực','area'],['Ngày vào','join_date','date'],['Trạng thái','status']],
  recruitments:[['Mã UV','recruit_code'],['Ứng viên','candidate_name'],['SĐT','phone'],['Nguồn','source'],['Người tuyển','recruiter_code','staff'],['Ngày PV','interview_date','date'],['Ngày nhận việc','start_work_date','date'],['Trạng thái','status']],
  landlords:[['Tên chủ nhà','owner_name'],['SĐT','phone'],['Số căn','property_count'],['Sale quản lý','staff_code','staff'],['Trạng thái','cooperation_status']],
  projects:[['Mã DA','project_code'],['Dự án','project_name'],['Địa chỉ','address'],['Chủ nhà','landlord_name'],['Sale lấy về','source_staff_code','staff'],['Ngày lấy','source_date','date'],['Khu vực','area'],['Trạng thái','status']],
  deposits:[['Mã cọc','deposit_code'],['Dự án','project_name'],['Sale chốt','sale_code','staff'],['Khách','customer_name'],['Giá thuê','rent_price','money'],['Tiền cọc','deposit_amount','money'],['Ngày cọc','deposit_date','date'],['Trạng thái','status']],
  transactions:[['Mã GD','transaction_code'],['Dự án','project_name'],['Sale chốt','sale_code','staff'],['Khách','customer_name'],['Doanh thu','revenue','money'],['Hoa hồng','commission','money'],['Ngày GDTC','transaction_date','date'],['Trạng thái','status']],
  source_rewards:[['Người lấy nguồn','source_staff_code','staff'],['Người chốt','closing_staff_code','staff'],['Ngày lấy về','source_date','date'],['Ngày chốt','closing_date','date'],['Dự án','project_name'],['Tiền thưởng','reward_amount','money'],['Thanh toán','payment_status']],
  audit_logs:[['Người dùng','user_name'],['Hành động','action_type'],['Module','module_name'],['Mã/ID','record_id'],['Mô tả','description'],['Thời gian','created_at','date']]
 }
 const cols=configs[table]
 function val(row,col){const v=row[col[1]]; if(col[2]==='staff')return staffName(v); if(col[2]==='date')return fmtDate(String(v||'').slice(0,10)); if(col[2]==='money')return money(v); return v}
 return <div className="tableWrap"><table><thead><tr>{cols.map(c=><th key={c[1]}>{c[0]}</th>)}{table!=='audit_logs'&&<th>Hành động</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{cols.map(c=><td key={c[1]}>{val(r,c)}</td>)}{table!=='audit_logs'&&<td><button className="small blue" onClick={()=>edit(r)}>Sửa</button><button className="small red" onClick={()=>del(r.id)}>Xóa</button></td>}</tr>)}</tbody></table></div>
}

createRoot(document.getElementById('root')).render(<App />)
