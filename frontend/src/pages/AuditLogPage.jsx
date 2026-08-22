import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Loader2 } from 'lucide-react';

const AuditLogPage = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Standard fetch to the backend Audit Log Middleware routers
    apiClient.get('/audit/').then(({ data }) => {
       setLogs(data);
       setLoading(false);
    }).catch(e => {
       console.error(e);
       setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto animation-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t('audit.title')}</h1>
        <p className="text-text-muted">{t('audit.description')}</p>
      </div>

      <div className="glass-panel p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-text-muted">
                <th className="p-4 font-bold">{t('audit.timestamp')}</th>
                <th className="p-4 font-bold">{t('audit.userRole')}</th>
                <th className="p-4 font-bold">{t('audit.actionPath')}</th>
                <th className="p-4 font-bold">{t('shortlisted.status')}</th>
                <th className="p-4 font-bold text-right">{t('audit.duration')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                 <tr><td colSpan="5" className="p-8 text-center text-text-muted"><Loader2 className="animate-spin mx-auto text-primary-500" /></td></tr>
              ) : logs.length === 0 ? (
                 <tr><td colSpan="5" className="p-8 text-center text-text-muted">{t('audit.noTrailsLogged')}</td></tr>
              ) : logs.map((log, i) => (
                <tr key={i} className="hover:bg-surface/50 text-sm">
                  <td className="p-4 text-text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-4 text-white font-medium">{log.user || t('audit.anonymous')}</td>
                  <td className="p-4 text-primary-400 font-mono text-xs">{log.action || log.path}</td>
                  <td className="p-4">
                     <span className={`px-2 py-1 rounded text-xs font-bold ${log.status >= 400 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                       {log.status}
                     </span>
                  </td>
                  <td className="p-4 text-right text-text-muted">{log.duration_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
