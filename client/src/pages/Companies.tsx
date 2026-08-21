import React from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { Building2, Globe, Users, Briefcase, Star, ExternalLink } from 'lucide-react';

const tierColors: Record<string, string> = {
  super_dream: 'badge bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 dark:from-purple-900/30 dark:to-indigo-900/30 dark:text-purple-400',
  dream: 'badge bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-400',
  core: 'badge bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  standard: 'badge badge-neutral',
};

export const CompaniesPage: React.FC = () => {
  const { data, loading } = useApi(() => api.getCompanies());

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-52 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="section-title">Companies</h1>
        <p className="text-surface-500 mt-1">{data?.total || 0} recruiting companies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data?.data?.map((company: any, i: number) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass-card p-5 space-y-4 cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{company.name}</h3>
                  <span className="text-xs text-surface-400">{company.industry}</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Drives */}
            <div className="space-y-2">
              {company.recruitmentDrives?.map((drive: any) => (
                <div key={drive.id} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <div>
                    <div className="text-sm font-medium text-surface-700 dark:text-surface-300">{drive.role}</div>
                    <div className="text-xs text-surface-400">₹{drive.packageLpa} LPA</div>
                  </div>
                  <span className={tierColors[drive.offerTier] || 'badge badge-neutral'}>{drive.offerTier.replace('_', ' ')}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-surface-500 pt-2 border-t border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{company._count?.recruitmentDrives || 0} drives</div>
              <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{company.recruitmentDrives?.reduce((s: number, d: any) => s + (d._count?.applications || 0), 0) || 0} applications</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
