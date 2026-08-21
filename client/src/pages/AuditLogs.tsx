import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { ScrollText, Filter, ChevronLeft, ChevronRight, Clock, User, Activity, Edit, Trash2, Plus, Eye } from 'lucide-react';

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="w-4 h-4 text-success-500" />,
  update: <Edit className="w-4 h-4 text-blue-500" />,
  delete: <Trash2 className="w-4 h-4 text-danger-500" />,
  allocation_run: <Activity className="w-4 h-4 text-primary-500" />,
  override: <Edit className="w-4 h-4 text-warning-500" />,
  review: <Eye className="w-4 h-4 text-purple-500" />,
  reschedule: <Clock className="w-4 h-4 text-info-500" />,
  login: <User className="w-4 h-4 text-surface-400" />,
};

export const AuditPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const params: Record<string, string> = { page: String(page), limit: '25' };
  if (action) params.action = action;

  const { data, loading } = useApi(() => api.getAuditLogs(params), [page, action]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-3"><ScrollText className="w-7 h-7 text-primary-500" /> Audit Logs</h1>
        <p className="text-surface-500 mt-1">Complete record of all system actions</p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-surface-400" />
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">All Actions</option>
          {['create', 'update', 'delete', 'allocation_run', 'override', 'review', 'reschedule', 'login'].map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[...Array(10)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr><th>Action</th><th>Entity</th><th>Description</th><th>User</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                {data?.data?.map((log: any, i: number) => (
                  <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                    <td>
                      <div className="flex items-center gap-2">
                        {actionIcons[log.action] || <Activity className="w-4 h-4" />}
                        <span className="text-sm font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-neutral text-xs">{log.entity}</span></td>
                    <td className="text-sm text-surface-600 dark:text-surface-400 max-w-md truncate">{log.description}</td>
                    <td className="text-sm">{log.user?.name || 'System'}</td>
                    <td className="text-sm text-surface-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200 dark:border-surface-700">
              <span className="text-sm text-surface-500">Page {page} of {data?.totalPages || 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setPage(Math.min(data?.totalPages || 1, page + 1))} disabled={page >= (data?.totalPages || 1)} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
