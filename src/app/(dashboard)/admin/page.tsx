'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTargetData, MonthlyTarget } from '@/hooks/useTargetData'
import { cn } from '@/lib/utils'
import { BRAND_NAMES } from '@/lib/constants'
import { Upload, Trash2, UserPlus, Edit2, X, Check, Shield, Eye, EyeOff } from 'lucide-react'
import * as XLSX from 'xlsx'

const ROLES = [
  { value: 'admin', label: '어드민', desc: '전체 접근' },
  { value: 'manager', label: '매니저', desc: '브랜드별 제한 가능' },
  { value: 'staff', label: '스태프', desc: '브랜드별 제한 가능' },
]

const BRAND_OPTIONS = Object.entries(BRAND_NAMES).map(([code, name]) => ({ code, name }))

interface UserProfile {
  id: string; email: string; name: string
  role: 'admin' | 'manager' | 'staff' | 'vendor'
  brands: string[]; vendor_name?: string
}

type Tab = 'users' | 'targets'

export default function AdminPage() {
  const { isAdmin, profile } = useAuth()
  const { targets, lastUpdated, saveTargets, clearTargets } = useTargetData()
  const [tab, setTab] = useState<Tab>('users')

  // ── 사용자 관리 ──
  const [users, setUsers] = useState<UserProfile[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<UserProfile | null>(null)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'staff', brands: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (json.users) setUsers(json.users)
    } catch {}
    finally { setUsersLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleBrandToggle = (code: string) => {
    setForm(f => ({
      ...f,
      brands: f.brands.includes(code) ? f.brands.filter(b => b !== code) : [...f.brands, code],
    }))
  }

  const handleEdit = (u: UserProfile) => {
    setEditUser(u)
    setForm({ email: u.email, password: '', name: u.name, role: u.role, brands: [...u.brands] })
    setShowForm(true)
    setMsg(null)
  }

  const handleNew = () => {
    setEditUser(null)
    setForm({ email: '', password: '', name: '', role: 'staff', brands: [] })
    setShowForm(true)
    setMsg(null)
  }

  const handleSave = async () => {
    setSaving(true); setMsg(null)
    try {
      if (editUser) {
        // 수정
        const body: Record<string, unknown> = { id: editUser.id, name: form.name, role: form.role, brands: form.brands }
        if (form.password) body.password = form.password
        const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setMsg({ type: 'ok', text: '수정 완료' })
      } else {
        // 생성
        if (!form.email || !form.password || !form.name) { setMsg({ type: 'err', text: '필수 항목을 입력해주세요.' }); setSaving(false); return }
        const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setMsg({ type: 'ok', text: '계정 생성 완료' })
      }
      fetchUsers()
      setTimeout(() => { setShowForm(false); setMsg(null) }, 1000)
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '오류 발생' })
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (u: UserProfile) => {
    if (u.id === profile?.id) return alert('본인 계정은 삭제할 수 없습니다.')
    if (!confirm(`${u.name} (${u.email}) 계정을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); alert(j.error) }
      fetchUsers()
    } catch {}
  }

  // ── 목표매출 업로드 ──
  const [uploading, setUploading] = useState(false)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

      // 컬럼명 공백 트림
      const trimmedRows = rows.map(r => {
        const obj: Record<string, any> = {}
        for (const [k, v] of Object.entries(r)) obj[k.trim()] = v
        return obj
      })

      // 컬럼 자동 감지: 신규 형식(매장별) vs 기존 형식(합산)
      const sample = trimmedRows[0] ?? {}
      const isNewFormat = '매출액(원)' in sample && '매장코드' in sample

      let parsed: MonthlyTarget[] = []

      if (isNewFormat) {
        // 신규 형식: 매장별 행 → 브랜드+채널+월 합산
        const agg = new Map<string, { target: number; brandnm: string; yyyymm: string; shoptypenm?: string }>()
        for (const r of trimmedRows) {
          const yyyymm = String(r['년월']).replace(/[^0-9]/g, '')
          const brandnm = String(r['브랜드'] ?? '')
          const target = Number(r['매출액(원)']) || 0
          const shoptypenm = r['채널'] ? String(r['채널']) : undefined
          if (!yyyymm || !brandnm || !target) continue
          const key = `${brandnm}|${yyyymm}|${shoptypenm ?? ''}`
          const prev = agg.get(key)
          if (prev) { prev.target += target }
          else { agg.set(key, { brandnm, yyyymm, target, shoptypenm }) }
        }
        parsed = Array.from(agg.values())
      } else {
        // 기존 형식: 년월, 브랜드, 목표
        parsed = trimmedRows
          .filter(r => r['년월'] && r['브랜드'] && r['목표'])
          .map(r => ({
            yyyymm: String(r['년월']).replace(/[^0-9]/g, ''),
            brandnm: String(r['브랜드']),
            target: Number(r['목표']) || 0,
            shoptypenm: r['채널'] ? String(r['채널']) : undefined,
          }))
      }

      if (parsed.length === 0) {
        alert('유효한 데이터가 없습니다. 엑셀 컬럼을 확인해주세요.\n지원 형식:\n① 년월, 브랜드, 목표 (합산형)\n② 브랜드, 매장코드, 년월, 매출액(원) (매장별형)')
      } else {
        saveTargets(parsed, file.name)
        alert(`${parsed.length}건 업로드 완료`)
      }
    } catch { alert('파일 읽기 오류') }
    finally { setUploading(false); e.target.value = '' }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">관리자 권한이 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-0.5">임직원 관리 및 목표매출 설정</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 w-fit">
        {([['users', '임직원 관리'], ['targets', '목표매출']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('px-4 py-1.5 text-xs rounded-md font-medium transition-all',
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {label}
          </button>
        ))}
      </div>

      {/* ── 임직원 관리 탭 ── */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">임직원 목록</span>
            <button onClick={handleNew}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors">
              <UserPlus size={13} /> 계정 추가
            </button>
          </div>

          {/* 생성/수정 폼 */}
          {showForm && (
            <div className="px-4 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{editUser ? '계정 수정' : '새 계정 생성'}</span>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                <div>
                  <label className="text-[11px] text-gray-500 font-medium">이름 *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-medium">이메일 *</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editUser}
                    className={cn('w-full mt-0.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none', editUser && 'bg-gray-100 text-gray-400')} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-medium">{editUser ? '비밀번호 (변경 시)' : '비밀번호 *'}</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editUser ? '변경 없으면 비워두세요' : ''}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-medium">역할 *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none bg-white">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                  </select>
                </div>
              </div>
              {/* 브랜드 권한 */}
              {form.role !== 'admin' && (
                <div className="mt-3">
                  <label className="text-[11px] text-gray-500 font-medium">접근 가능 브랜드 (미선택 시 전체)</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {BRAND_OPTIONS.map(b => (
                      <button key={b.code} onClick={() => handleBrandToggle(b.code)}
                        className={cn('px-2.5 py-1 text-xs rounded-full border transition-colors',
                          form.brands.includes(b.code)
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-4">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors">
                  <Check size={13} /> {saving ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">취소</button>
                {msg && <span className={cn('text-xs font-medium', msg.type === 'ok' ? 'text-blue-600' : 'text-red-500')}>{msg.text}</span>}
              </div>
            </div>
          )}

          {/* 사용자 목록 */}
          <div className="overflow-x-auto">
            {usersLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">로딩 중...</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 font-semibold">
                    <th className="text-left px-4 py-2.5">이름</th>
                    <th className="text-left px-3 py-2.5">이메일</th>
                    <th className="text-center px-3 py-2.5">역할</th>
                    <th className="text-left px-3 py-2.5">접근 브랜드</th>
                    <th className="text-center px-3 py-2.5 w-[80px]">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role !== 'vendor').map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{u.name}</td>
                      <td className="px-3 py-2.5 text-gray-500">{u.email}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                          u.role === 'admin' ? 'bg-violet-100 text-violet-700' :
                          u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                          {u.role === 'admin' ? '어드민' : u.role === 'manager' ? '매니저' : '스태프'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {u.role === 'admin' ? (
                          <span className="text-gray-400 text-[10px]">전체</span>
                        ) : u.brands.length === 0 ? (
                          <span className="text-gray-400 text-[10px]">전체</span>
                        ) : (
                          <div className="flex flex-wrap gap-0.5">
                            {u.brands.map(b => (
                              <span key={b} className="px-1.5 py-px rounded text-[10px] bg-gray-100 text-gray-600 font-medium">
                                {BRAND_NAMES[b] ?? b}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(u)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors" title="수정">
                            <Edit2 size={13} />
                          </button>
                          {u.id !== profile?.id && (
                            <button onClick={() => handleDelete(u)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="삭제">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── 목표매출 탭 ── */}
      {tab === 'targets' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">목표매출 업로드</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">엑셀 파일 (년월, 브랜드, 목표, 채널 컬럼)</p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[10px] text-gray-400">
                  최종 업데이트: {new Date(lastUpdated).toLocaleString('ko-KR')}
                </span>
              )}
              {targets.length > 0 && (
                <button onClick={() => { if (confirm('목표 데이터를 삭제하시겠습니까?')) clearTargets() }}
                  className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 border border-red-200 rounded-full px-2 py-0.5">
                  <Trash2 size={10} /> 삭제
                </button>
              )}
            </div>
          </div>

          <label className={cn(
            'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors',
            uploading ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
          )}>
            <Upload size={24} className="text-gray-300 mb-2" />
            <span className="text-xs text-gray-500">{uploading ? '업로드 중...' : '엑셀 파일을 클릭하여 선택'}</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>

          {targets.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">현재 목표 데이터 ({targets.length}건)</h4>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                      <th className="text-left px-3 py-2">년월</th>
                      <th className="text-left px-3 py-2">브랜드</th>
                      <th className="text-left px-3 py-2">채널</th>
                      <th className="text-right px-3 py-2">목표</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.slice(0, 100).map((t, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-3 py-1.5 text-gray-700">{t.yyyymm}</td>
                        <td className="px-3 py-1.5 text-gray-700">{t.brandnm}</td>
                        <td className="px-3 py-1.5 text-gray-500">{t.shoptypenm || '—'}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-gray-800">{t.target.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {targets.length > 100 && <p className="text-[10px] text-gray-400 px-3 py-1">...외 {targets.length - 100}건</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
