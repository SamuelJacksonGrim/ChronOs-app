
import React from 'react';
import { OSSettings, AppId } from '../types';
import { STORE_APPS } from '../constants';
import { Download, CheckCircle, Grid } from 'lucide-react';

interface AppStoreProps {
  settings: OSSettings;
  onUpdate: (newSettings: OSSettings) => void;
}

const AppStore: React.FC<AppStoreProps> = ({ settings, onUpdate }) => {
  const isInstalled = (id: AppId) => settings.installedApps.includes(id);

  const toggleInstall = (id: AppId) => {
    let newApps = [...settings.installedApps];
    if (isInstalled(id)) {
      newApps = newApps.filter(appId => appId !== id);
    } else {
      newApps.push(id);
    }
    onUpdate({ ...settings, installedApps: newApps });
  };

  return (
    <div className="h-full w-full bg-gray-900/90 backdrop-blur-xl text-white overflow-y-auto p-8 rounded-lg">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 pb-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                <Grid size={32} className="text-white" />
             </div>
             <div>
                <h1 className="font-display text-3xl font-bold">Module Store</h1>
                <p className="text-gray-400 text-sm">Expand Chronos Capabilities</p>
             </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STORE_APPS.map((app) => (
            <div key={app.id} className="bg-black/40 border border-gray-800 rounded-xl p-6 flex flex-col gap-4 hover:bg-white/5 hover:border-gray-600 transition-all group">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <app.icon size={24} />
                </div>
                {isInstalled(app.id) && <CheckCircle size={20} className="text-emerald-500" />}
              </div>
              
              <div>
                <h3 className="font-bold text-lg">{app.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{app.description}</p>
              </div>

              <button 
                onClick={() => toggleInstall(app.id)}
                className={`mt-auto w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                  ${isInstalled(app.id) 
                    ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' 
                    : 'bg-white text-black hover:bg-cyan-50'
                  }
                `}
              >
                {isInstalled(app.id) ? 'Uninstall' : 'Install Module'}
                {!isInstalled(app.id) && <Download size={14} />}
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-12 p-6 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-2xl border border-white/5 text-center">
           <p className="text-sm text-gray-400">
             More modules are being synthesized by the core...
           </p>
        </div>

      </div>
    </div>
  );
};

export default AppStore;
