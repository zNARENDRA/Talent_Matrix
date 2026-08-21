import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi, useDebounce } from '../hooks/useApi';
import { api } from '../lib/api';
import { Search, Filter, ChevronLeft, ChevronRight, GraduationCap, Mail, BookOpen, Star, Briefcase, ArrowRight } from 'lucide-react';

const DEPARTMENTS = ['All', 'CSE', 'IT', 'ECE', 'ME', 'EE', 'AI&DS'];
const STATUSES = ['All', 'registered', 'eligible', 'placed', 'opted_out'];

const statusBadge: Record<string, string> = {
  registered: 'badge badge-neutral',
  eligible: 'badge badge-info',
  placed: 'badge badge-success',
  opted_out: 'badge badge-warning',
};

export const StudentsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const params: Record<string, string> = { page: String(page), limit: '20' };
  if (debouncedSearch) params.search = debouncedSearch;
  if (department !== 'All') params.department = department;
  if (status !== 'All') params.status = status;

  const { data, loading } = useApi(() => api.getStudents(params), [debouncedSearch, department, status, page]);
  const { data: studentDetail } = useApi(
    () => selectedStudent ? api.getStudent(selectedStudent.id) : Promise.resolve(null),
    [selectedStudent?.id]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Students</h1>
          <p className="text-surface-500 mt-1">{data?.total || 0} students in the system</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, ID, or email..." className="input-field pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-400" />
            <select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="input-field w-auto">
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field w-auto">
              {STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 glass-card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-lg" />)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Department</th>
                      <th>GPA</th>
                      <th>Status</th>
                      <th>Offers</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data?.map((student: any, i: number) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className={`cursor-pointer ${selectedStudent?.id === student.id ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                              {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-surface-900 dark:text-surface-100">{student.name}</div>
                              <div className="text-xs text-surface-400">{student.studentId}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-neutral">{student.department}</span></td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="font-medium">{student.gpa.toFixed(2)}</span>
                          </div>
                        </td>
                        <td><span className={statusBadge[student.status] || 'badge'}>{student.status.replace('_', ' ')}</span></td>
                        <td>
                          {student.offers?.length > 0 ? (
                            <span className="badge badge-success">{student.offers.length} offer{student.offers.length > 1 ? 's' : ''}</span>
                          ) : (
                            <span className="text-surface-400 text-sm">—</span>
                          )}
                        </td>
                        <td><ArrowRight className="w-4 h-4 text-surface-300" /></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200 dark:border-surface-700">
                <span className="text-sm text-surface-500">
                  Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, data?.total || 0)} of {data?.total || 0}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-ghost p-1.5 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {[...Array(Math.min(5, data?.totalPages || 1))].map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-primary-600 text-white' : 'text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(Math.min(data?.totalPages || 1, page + 1))} disabled={page >= (data?.totalPages || 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Student Detail Panel */}
        {selectedStudent && studentDetail && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-96 glass-card p-5 space-y-5 h-fit sticky top-20"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold mb-3">
                {studentDetail.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <h3 className="font-semibold text-lg text-surface-900 dark:text-white">{studentDetail.name}</h3>
              <p className="text-sm text-surface-500">{studentDetail.studentId}</p>
              <span className={`mt-2 ${statusBadge[studentDetail.status]}`}>{studentDetail.status}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-surface-400" />{studentDetail.email}</div>
              <div className="flex items-center gap-2 text-sm"><BookOpen className="w-4 h-4 text-surface-400" />{studentDetail.department} • GPA: {studentDetail.gpa.toFixed(2)}</div>
              <div className="flex items-center gap-2 text-sm"><GraduationCap className="w-4 h-4 text-surface-400" />Class of {studentDetail.graduationYear}</div>
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {JSON.parse(studentDetail.skills || '[]').map((skill: string) => (
                  <span key={skill} className="badge badge-primary text-xs">{skill}</span>
                ))}
              </div>
            </div>

            {/* Offers */}
            {studentDetail.offers?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">Offers</h4>
                <div className="space-y-2">
                  {studentDetail.offers.map((offer: any) => (
                    <div key={offer.id} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800">
                      <div>
                        <div className="text-sm font-medium">{offer.drive?.company?.name}</div>
                        <div className="text-xs text-surface-400">{offer.tier.replace('_', ' ')} • ₹{offer.packageLpa} LPA</div>
                      </div>
                      <span className={offer.status === 'accepted' ? 'badge badge-success' : 'badge badge-warning'}>{offer.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="text-xs font-semibold text-surface-500 uppercase mb-2">Activity Timeline</h4>
              <div className="space-y-0">
                {studentDetail.applications?.slice(0, 5).map((app: any) => (
                  <div key={app.id} className="flex items-start gap-3 py-2">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-400" />
                    <div>
                      <div className="text-sm">{app.status === 'offered' ? 'Received offer from' : `Applied to`} {app.drive?.company?.name}</div>
                      <div className="text-xs text-surface-400">{app.drive?.role} • {app.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
