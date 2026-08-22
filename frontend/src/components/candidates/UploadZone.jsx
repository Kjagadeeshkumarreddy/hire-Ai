import { useTranslation } from 'react-i18next';
import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';
import { useCandidateMutations } from '../../hooks/useCandidates';

export const UploadZone = ({ jobId }) => {
  const { t } = useTranslation();
  const { uploadBatch } = useCandidateMutations();
  const navigate = useNavigate();
  const [zipFile, setZipFile] = useState(null);
  const [excel, setExcel] = useState(null);
  const fileInputRef = React.useRef(null);

  const processFiles = (files) => {
    const zip = files.find(f => f.name.endsWith('.zip'));
    const newExcel = files.find(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    
    if (zip) setZipFile(zip);
    if (newExcel) setExcel(newExcel);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileSelect = (e) => {
    processFiles(Array.from(e.target.files));
  };
  
  const submitBatch = () => {
    if (!excel || !zipFile) return;
    if (!jobId) {
       alert(t('uploadZone.selectJDContext'));
       return;
    }
    
    uploadBatch.mutate(
      { jobId, zipFile, excelFile: excel },
      {
        onSuccess: () => {
          setTimeout(() => {
            navigate('/candidates');
          }, 1500);
        }
      }
    );
  };

  return (
    <div className="glass-panel p-6">
      <input 
        type="file" 
        multiple 
        ref={fileInputRef}
        className="hidden" 
        onChange={handleFileSelect}
        accept=".zip,.xlsx,.xls"
      />
      
      <div 
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-primary-500 hover:bg-primary-500/5 transition-all cursor-pointer bg-surface/50 group"
      >
        <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Upload size={32} className="text-primary-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{t('uploadZone.dropArchive')}</h3>
        <p className="text-text-muted max-w-sm mb-6">
          {t('uploadZone.dropDescription')} 
        </p>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-3 h-3 rounded-full ${excel ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
            <span className={excel ? 'text-white font-medium' : 'text-text-muted'}>
              {excel ? excel.name : t('uploadZone.excelMissing')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-3 h-3 rounded-full ${zipFile ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
            <span className={zipFile ? 'text-white font-medium' : 'text-text-muted'}>
              {zipFile ? zipFile.name : t('uploadZone.zipMissing')}
            </span>
          </div>
        </div>

        <button 
          onClick={submitBatch}
          disabled={!excel || !zipFile || uploadBatch.isPending}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 min-w-[200px] justify-center"
        >
          {uploadBatch.isPending && <Loader2 size={16} className="animate-spin" />}
          {uploadBatch.isPending ? t('uploadZone.processingEngine') : t('uploadZone.executeIngestion')}
        </button>
      </div>
      {uploadBatch.isSuccess && (
        <p className="mt-2 text-green-500">{t('uploadZone.uploadSuccessful')}</p>
      )}
      {uploadBatch.isError && (
        <p className="mt-2 text-red-500">Error: {uploadBatch.error.message}</p>
      )}
    </div>
  );
};
