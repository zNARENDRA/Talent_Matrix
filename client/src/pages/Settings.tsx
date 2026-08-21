import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  Settings as SettingsIcon, Shield, Briefcase, Bell, Database,
  Users, Bot, Sparkles, Plus, Check, Edit2, Trash2, Key,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { data: aiStatus, refetch: refetchAI } = useApi(() => api.getAIStatus());
  const { data: policiesData, refetch: refetchPolicies } = useApi(() => api.getOfferPolicies());
  const { data: authData } = useApi(() => api.getMe());

  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [showNewPolicyModal, setShowNewPolicyModal] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyTier, setNewPolicyTier] = useState('dream');
  const [newPolicyDesc, setNewPolicyDesc] = useState('');
  const [blockLower, setBlockLower] = useState(true);
  const [allowUpgrade, setAllowUpgrade] = useState(true);

  const handleProviderSwitch = async (provider: string) => {
    try {
      await api.setAIProvider(provider);
      setSelectedProvider(provider);
      refetchAI();
    } catch (err: any) {
      alert('Failed to switch AI provider: ' + err.message);
    }
  };

  const handleTogglePolicyActive = async (policy: any) => {
    try {
      await api.updateOfferPolicy(policy.id, { isActive: !policy.isActive });
      refetchPolicies();
    } catch (err: any) {
      alert('Failed to update policy: ' + err.message);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName || !newPolicyTier) return;
    try {
      await api.createOfferPolicy({
        name: newPolicyName,
        description: newPolicyDesc,
        tier: newPolicyTier,
        rules: { blockLowerTiers: blockLower, allowUpgrade },
        isActive: true,
      });
      setShowNewPolicyModal(false);
      setNewPolicyName('');
      setNewPolicyDesc('');
      refetchPolicies();
    } catch (err: any) {
      alert('Error creating policy: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="section-title flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary-500" />
          Settings & Governance
        </h1>
        <p className="text-surface-500 mt-1">
          Configure database-backed offer policies, active AI intelligence provider, and role permissions
        </p>
      </div>

      {/* 1. AI Intelligence Provider Configuration */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="card-title text-base">AI Inference Provider Configuration</h2>
              <p className="text-xs text-surface-500">
                Choose the model backend used for candidate assessment telemetry explainability and matching reasoning
              </p>
            </div>
          </div>

          <span className="badge badge-primary text-xs uppercase font-mono">
            Active: {aiStatus?.activeProvider} ({aiStatus?.model})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {[
            {
              id: 'gemini',
              name: 'Google Gemini',
              model: 'gemini-1.5-pro',
              desc: 'High-accuracy multimodal intelligence for complex code anomaly reasoning',
              configured: Boolean(aiStatus?.isConfigured && aiStatus?.activeProvider === 'Google Gemini'),
            },
            {
              id: 'openai',
              name: 'OpenAI',
              model: 'gpt-4o',
              desc: 'Advanced reasoning model for structured telemetry and integrity explainability',
              configured: Boolean(aiStatus?.isConfigured && aiStatus?.activeProvider === 'OpenAI'),
            },
            {
              id: 'deterministic',
              name: 'Deterministic Telemetry Intelligence',
              model: 'telemetry-engine-v2.0',
              desc: 'Zero-latency rules-based model with exact mathematical telemetry attribution',
              configured: true,
            },
          ].map((provider) => (
            <div
              key={provider.id}
              onClick={() => handleProviderSwitch(provider.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                (selectedProvider || (aiStatus?.activeProvider.toLowerCase().includes(provider.id) ? provider.id : '')) === provider.id
                  ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/30 ring-1 ring-primary-400'
                  : 'border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 hover:bg-surface-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-surface-900 dark:text-white">{provider.name}</span>
                {provider.configured && (
                  <span className="badge badge-success text-[10px]">READY</span>
                )}
              </div>
              <div className="text-xs font-mono text-primary-600 dark:text-primary-400 mb-1">{provider.model}</div>
              <p className="text-xs text-surface-500">{provider.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. Database-Driven Offer Policies */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="card-title text-base">Offer Locking & Tier Policies (Database-Driven)</h2>
              <p className="text-xs text-surface-500">
                Configure offer acceptance rules, upgrade permissions, and lower-tier lockouts enforced by the Allocation Engine
              </p>
            </div>
          </div>

          <button onClick={() => setShowNewPolicyModal(true)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Policy
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {policiesData?.data?.map((policy: any) => {
            const rules = typeof policy.rules === 'string' ? JSON.parse(policy.rules || '{}') : policy.rules;
            return (
              <div
                key={policy.id}
                className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-surface-900 dark:text-white">{policy.name}</span>
                    <span className="badge badge-primary text-xs uppercase">{policy.tier}</span>
                    {!policy.isActive && <span className="badge badge-neutral text-xs">INACTIVE</span>}
                  </div>
                  <p className="text-xs text-surface-500">{policy.description}</p>
                  <div className="text-[11px] font-mono text-surface-400">
                    Block Lower: {String(rules.blockLowerTiers ?? true)} • Allow Upgrades: {String(rules.allowUpgrade ?? true)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTogglePolicyActive(policy)}
                    className={`btn text-xs py-1.5 ${policy.isActive ? 'btn-secondary text-success-600' : 'btn-ghost text-surface-400'}`}
                  >
                    {policy.isActive ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 3. Role-Based Access Control Preview */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="card-title text-base">Current Session Authentication & RBAC</h2>
            <p className="text-xs text-surface-500">
              Authenticated identity verified against database User table
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-surface-900 dark:text-white">
              {authData?.name || 'Dr. Rajesh Kumar'}
            </div>
            <div className="text-xs text-surface-500">{authData?.email || 'admin@talentmatrix.edu'}</div>
          </div>
          <span className="badge badge-success text-xs uppercase font-mono">
            {authData?.role || 'super_admin'}
          </span>
        </div>
      </motion.div>

      {/* Modal for New Policy */}
      {showNewPolicyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 max-w-md w-full space-y-4">
            <h3 className="card-title text-base">Create Offer Placement Policy</h3>
            <form onSubmit={handleCreatePolicy} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase block mb-1">Policy Name</label>
                <input
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  placeholder="e.g. Super Dream Exclusive Lock"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase block mb-1">Offer Tier</label>
                <select
                  value={newPolicyTier}
                  onChange={(e) => setNewPolicyTier(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="super_dream">Super Dream</option>
                  <option value="dream">Dream</option>
                  <option value="core">Core</option>
                  <option value="standard">Standard</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase block mb-1">Description</label>
                <input
                  value={newPolicyDesc}
                  onChange={(e) => setNewPolicyDesc(e.target.value)}
                  placeholder="Explain why this policy locks lower tiers..."
                  className="input-field text-sm"
                />
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={blockLower} onChange={(e) => setBlockLower(e.target.checked)} />
                  <span>Block incoming lower tier offers once assigned</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allowUpgrade} onChange={(e) => setAllowUpgrade(e.target.checked)} />
                  <span>Allow student to upgrade to higher tier if selected</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowNewPolicyModal(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Policy to Database
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
