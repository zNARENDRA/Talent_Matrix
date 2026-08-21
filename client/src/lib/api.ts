const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('tm_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}: Request failed`);
  }
  return res.json();
}

export const api = {
  // Auth & Multi-Role Personas
  login: (data: { identifier?: string; email?: string; password?: string; role?: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),
  getUsers: () => request<any>('/auth/users'),
  getDemoAccounts: () => request<any>('/auth/demo-accounts'),

  // Recruitment Cycles (Module A)
  getRecruitmentCycles: () => request<any>('/recruitment-cycles'),
  getActiveCycle: () => request<any>('/recruitment-cycles/active'),
  createRecruitmentCycle: (data: any) => request<any>('/recruitment-cycles', { method: 'POST', body: JSON.stringify(data) }),
  updateRecruitmentCycle: (id: string, data: any) => request<any>(`/recruitment-cycles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Departments (Module A)
  getDepartments: () => request<any>('/departments'),
  createDepartment: (data: any) => request<any>('/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: any) => request<any>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Skills & Compatibility Engine (Module A)
  getSkills: () => request<any>('/skills'),
  createSkill: (data: any) => request<any>('/skills', { method: 'POST', body: JSON.stringify(data) }),
  getStudentSkills: (studentId: string) => request<any>(`/skills/students/${studentId}`),
  updateStudentSkills: (studentId: string, skills: any[]) =>
    request<any>(`/skills/students/${studentId}`, { method: 'POST', body: JSON.stringify({ skills }) }),
  getSkillCompatibility: (studentId: string, driveId: string) =>
    request<any>(`/skills/compatibility?studentId=${studentId}&driveId=${driveId}`),

  // Candidate Selection / Deselection Studio (Module A)
  getSelectionCandidates: (driveId: string) => request<any>(`/selection/drives/${driveId}/candidates`),
  submitRecruiterScores: (driveId: string, data: any) =>
    request<any>(`/selection/drives/${driveId}/scores`, { method: 'POST', body: JSON.stringify(data) }),
  recordSelectionDecision: (driveId: string, data: any) =>
    request<any>(`/selection/drives/${driveId}/decide`, { method: 'POST', body: JSON.stringify(data) }),
  getSelectionLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/selection/logs${qs}`);
  },

  // Recruitment Intelligence Crawler (Module A)
  getCrawlerSources: () => request<any>('/crawler/sources'),
  createCrawlerSource: (data: any) => request<any>('/crawler/sources', { method: 'POST', body: JSON.stringify(data) }),
  triggerCrawl: (sourceId?: string) => request<any>('/crawler/run', { method: 'POST', body: JSON.stringify({ sourceId }) }),
  getCrawledJobs: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<any>(`/crawler/jobs${qs}`);
  },
  getCrawledJobMatches: (jobId: string) => request<any>(`/crawler/jobs/${jobId}/matches`),
  convertCrawledJobToDrive: (jobId: string, data?: any) =>
    request<any>(`/crawler/jobs/${jobId}/convert`, { method: 'POST', body: JSON.stringify(data || {}) }),

  // Student Portal
  getStudentPortalMe: (studentId?: string) => {
    const qs = studentId ? `?studentId=${studentId}` : '';
    const headers: Record<string, string> = studentId ? { 'x-student-id': studentId } : {};
    return request<any>(`/student-portal/me${qs}`, { headers });
  },
  respondToOffer: (offerId: string, action: 'accepted' | 'rejected') =>
    request<any>(`/student-portal/offers/${offerId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
  submitStudentPreferences: (data: { studentId: string; preferences: { driveId: string; rank: number }[] }) =>
    request<any>('/student-portal/preferences', { method: 'POST', body: JSON.stringify(data) }),

  // AI Service
  getAIStatus: () => request<any>('/ai/status'),
  setAIProvider: (provider: string) => request<any>('/ai/provider', { method: 'POST', body: JSON.stringify({ provider }) }),

  // Offer Policies (Database-Driven)
  getOfferPolicies: () => request<any>('/offer-policies'),
  createOfferPolicy: (data: any) => request<any>('/offer-policies', { method: 'POST', body: JSON.stringify(data) }),
  updateOfferPolicy: (id: string, data: any) => request<any>(`/offer-policies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteOfferPolicy: (id: string) => request<any>(`/offer-policies/${id}`, { method: 'DELETE' }),

  // Analytics & YoY
  getDashboard: () => request<any>('/analytics/dashboard'),
  getFunnel: () => request<any>('/analytics/funnel'),
  getPlacement: () => request<any>('/analytics/placement'),
  getYoYAnalytics: () => request<any>('/analytics/yoy'),
  getPlacementOutcomes: () => request<any>('/analytics/outcomes'),
  getActivity: () => request<any>('/analytics/activity'),

  // Students
  getStudents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/students${qs}`);
  },
  getStudent: (id: string) => request<any>(`/students/${id}`),

  // Companies
  getCompanies: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/companies${qs}`);
  },
  getCompany: (id: string) => request<any>(`/companies/${id}`),

  // Recruitment Drives & Multi-Round Pipeline
  getDrives: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/recruitment-drives${qs}`);
  },
  getDrive: (id: string) => request<any>(`/recruitment-drives/${id}`),
  getPipelineKanban: (driveId?: string) => {
    const qs = driveId ? `?driveId=${driveId}` : '';
    return request<any>(`/recruitment-drives/pipeline/kanban${qs}`);
  },
  advanceCandidateRound: (data: { applicationId: string; nextStatus: string; nextRound?: number }) =>
    request<any>('/recruitment-drives/pipeline/advance', { method: 'POST', body: JSON.stringify(data) }),

  // Allocation Engine & What-If Simulation
  getAllocationPreview: (params?: { season?: string; cycleId?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/allocation/preview${qs}`);
  },
  runAllocation: (data?: any) => request<any>('/allocation/run', { method: 'POST', body: JSON.stringify(data || {}) }),
  simulateAllocation: (data: { season?: string; recruitmentCycleId?: string; overrides: any[] }) =>
    request<any>('/allocation/simulate', { method: 'POST', body: JSON.stringify(data) }),
  getAllocationRuns: () => request<any>('/allocation/runs'),
  getAllocationRun: (id: string) => request<any>(`/allocation/runs/${id}`),
  getAllocationResults: (runId: string) => request<any>(`/allocation/results/${runId}`),

  // Scheduling
  getInterviews: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/scheduling/interviews${qs}`);
  },
  getPanels: () => request<any>('/scheduling/panels'),
  getUtilization: () => request<any>('/scheduling/utilization'),
  getConflicts: () => request<any>('/scheduling/conflicts'),
  getPredictiveDelays: () => request<any>('/scheduling/predictive-delays'),
  reschedule: (data: any) => request<any>('/scheduling/reschedule', { method: 'POST', body: JSON.stringify(data) }),
  applyReschedule: (data: any) => request<any>('/scheduling/reschedule/apply', { method: 'POST', body: JSON.stringify(data) }),

  // Assessments & Real Telemetry
  getAssessments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/assessments${qs}`);
  },
  getAssessment: (id: string) => request<any>(`/assessments/${id}`),
  getAssessmentEvents: (id: string) => request<any>(`/assessments/${id}/events`),
  startAssessmentSession: (data: { studentId: string; assessmentName?: string; driveId?: string }) =>
    request<any>('/assessments/start', { method: 'POST', body: JSON.stringify(data) }),
  sendTelemetryEvent: (sessionId: string, data: { eventType: string; data?: any }) =>
    request<any>(`/assessments/${sessionId}/telemetry`, { method: 'POST', body: JSON.stringify(data) }),
  getAssessmentAIAnalysis: (sessionId: string) => request<any>(`/assessments/${sessionId}/ai-analysis`),

  // Anomalies
  getAnomalies: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/anomalies${qs}`);
  },
  getAnomalyStats: () => request<any>('/anomalies/stats/summary'),
  reviewAnomaly: (id: string, data: any) => request<any>(`/anomalies/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request<any>('/notifications'),
  markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<any>('/notifications/read-all', { method: 'PATCH' }),

  // Audit Logs
  getAuditLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/audit-logs${qs}`);
  },
};
