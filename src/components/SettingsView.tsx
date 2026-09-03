import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sliders,
  Palette,
  HardDrive,
  Eye,
  Lock,
  Download,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, ThemePalette, VisualizerStyle } from '../types';
import { exportFullVault, getStorageMetrics } from '../lib/db';
import { launchAboutBlankCloak, launchBlobCloak } from '../lib/security';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onWipeVault: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onWipeVault,
}) => {
  const [activeSection, setActiveSection] = useState<'dsp' | 'security' | 'cloak' | 'theme' | 'storage'>('dsp');
  const [storageMetrics, setStorageMetrics] = useState({ usageMB: '0.00', quotaMB: 'Unlimited', percent: '0' });

  useEffect(() => {
    getStorageMetrics().then(setStorageMetrics);
  }, []);

  const handleExportVault = async () => {
    const jsonStr = await exportFullVault();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotui-vault-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { id: 'dsp', icon: Sliders, label: 'Audio DSP & Playback' },
    { id: 'security', icon: Shield, label: 'DRM Shield & Security' },
    { id: 'cloak', icon: Eye, label: 'Tab Cloak & Disguises' },
    { id: 'theme', icon: Palette, label: 'Visual Theming' },
    { id: 'storage', icon: HardDrive, label: 'Vault Storage & Backup' },
  ];

  return (
    <div className="max-w-4xl pb-24 select-none">
      {/* Header */}
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-widest text-[#48e4ff] font-mono font-bold mb-1">
          Configuration Center
        </p>
        <h1 className="text-4xl font-serif font-bold text-white tracking-tight mb-2">
          System Deck Settings
        </h1>
        <p className="text-xs text-[#8aaeb5] max-w-xl">
          Configure Web Audio DSP parameters, privacy overlays, stealth about:blank cloaking, and persistent storage.
        </p>
      </header>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 border-b border-[#1a3840]">
        {sections.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-[#143e47] text-white border border-[#48e4ff]/40 shadow-sm'
                  : 'bg-[#061013] text-[#789d9a] hover:bg-[#0e242a] hover:text-white border border-[#142a30]'
              }`}
            >
              <sec.icon size={15} className={isActive ? 'text-[#48e4ff]' : ''} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: DSP & Playback Matrix */}
      {activeSection === 'dsp' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">Playback Transitions & Audio Buffer</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Configure Web Audio pipeline transitions, gapless buffer caches, and smart shuffle.
            </p>

            <div className="space-y-5">
              {/* Crossfade */}
              <div className="flex items-center justify-between py-3 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Crossfade Duration</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Smoothly blends overlapping tracks during transitions.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={settings.playback.crossfadeSeconds}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      onUpdateSettings((prev) => ({
                        ...prev,
                        playback: { ...prev.playback, crossfadeSeconds: v },
                      }));
                    }}
                    className="w-32 accent-[#48e4ff]"
                  />
                  <span className="text-xs font-mono text-[#48e4ff] w-10 text-right">
                    {settings.playback.crossfadeSeconds}s
                  </span>
                </div>
              </div>

              {/* Gapless */}
              <div className="flex items-center justify-between py-3 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Gapless Audio Pre-Buffering</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Pre-decodes next audio buffer in memory to eliminate silence gaps.
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      playback: { ...prev.playback, gapless: !prev.playback.gapless },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    settings.playback.gapless ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      settings.playback.gapless ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Auto Play Next */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-xs font-bold text-white">Continuous Autoplay</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Automatically triggers next track or smart recommendation when queue concludes.
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      playback: { ...prev.playback, autoPlayNext: !prev.playback.autoPlayNext },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    settings.playback.autoPlayNext ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      settings.playback.autoPlayNext ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Security & DRM Shield */}
      {activeSection === 'security' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">DRM Anti-Capture Shield</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Blocks browser extensions, screen recording utilities, and PrintScreen screenshotting.
            </p>

            <div className="space-y-5">
              {/* Anti-Screenshot Toggle */}
              <div className="flex items-center justify-between py-3 border-b border-[#11242a]">
                <div>
                  <div className="text-xs font-bold text-white">Enable Anti-Screenshot DRM Overlay</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Instantly blanks the screen with a blackout curtain when focus is blurred or capture is detected.
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        antiScreenshotEnabled: !prev.security.antiScreenshotEnabled,
                      },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    settings.security.antiScreenshotEnabled ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      settings.security.antiScreenshotEnabled ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>

              {/* Right click prevention */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-xs font-bold text-white">Block Context Menu Inspection</div>
                  <div className="text-[11px] text-[#789d9a] mt-0.5">
                    Disables browser right-click menu to prevent element inspection.
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        blockRightClick: !prev.security.blockRightClick,
                      },
                    }))
                  }
                  className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${
                    settings.security.blockRightClick ? 'bg-[#48e4ff]' : 'bg-[#152e34]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      settings.security.blockRightClick ? 'translate-x-5 bg-[#051a20]' : 'bg-[#789d9a]'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: AB Spoof & Cloaking */}
      {activeSection === 'cloak' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">Stealth Launchers & Cloaks</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Launch Spotui inside an isolated browser context to prevent history logging and bypass web filters.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-[#091a1e] border border-[#1a3840] flex flex-col justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield size={16} className="text-[#48e4ff]" />
                    <span>about:blank Cloak</span>
                  </div>
                  <p className="text-xs text-[#789d9a] mt-1.5 leading-relaxed">
                    Spawns a new tab navigating to about:blank with Spotui injected into an invisible full-page iframe.
                  </p>
                </div>
                <button
                  onClick={launchAboutBlankCloak}
                  className="mt-5 w-full py-2.5 bg-[#143e47] hover:bg-[#1b515d] text-[#48e4ff] border border-[#48e4ff]/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Launch about:blank</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-[#091a1e] border border-[#1a3840] flex flex-col justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock size={16} className="text-[#34d399]" />
                    <span>blob: Sandboxed Frame</span>
                  </div>
                  <p className="text-xs text-[#789d9a] mt-1.5 leading-relaxed">
                    Creates an ephemeral blob: URL containing an isolated player instance.
                  </p>
                </div>
                <button
                  onClick={launchBlobCloak}
                  className="mt-5 w-full py-2.5 bg-[#0e2d26] hover:bg-[#133e34] text-[#34d399] border border-[#34d399]/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} />
                  <span>Launch blob: Frame</span>
                </button>
              </div>
            </div>

            {/* Tab Disguise Presets */}
            <div className="pt-4 border-t border-[#11242a]">
              <div className="text-xs font-bold text-white mb-3">Live Tab Disguise Preset</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'Default (Spotui)' },
                  { id: 'google-classroom', label: 'Google Classroom' },
                  { id: 'google-drive', label: 'Google Drive' },
                  { id: 'wikipedia', label: 'Wikipedia' },
                  { id: 'canvas', label: 'Canvas LMS' },
                  { id: 'calculator', label: 'Desmos Calculator' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        security: { ...prev.security, cloakPreset: preset.id as any },
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.security.cloakPreset === preset.id
                        ? 'bg-[#143e47] border-[#48e4ff]/50 text-white shadow-sm'
                        : 'bg-[#091a1e] border-[#142a30] text-[#789d9a] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{preset.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Visual Theming */}
      {activeSection === 'theme' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">Cyber Accent Palettes</h3>
            <p className="text-xs text-[#789d9a] mb-6">Select master glow accents and visualizer algorithms.</p>

            <div className="grid grid-cols-5 gap-3 mb-8">
              {[
                { id: 'cyan', label: 'Signal Cyan', hex: '#48e4ff' },
                { id: 'violet', label: 'Cyber Violet', hex: '#c084fc' },
                { id: 'emerald', label: 'Matrix Emerald', hex: '#34d399' },
                { id: 'amber', label: 'Amber Synth', hex: '#fbbf24' },
                { id: 'crimson', label: 'Crimson Flame', hex: '#f87171' },
              ].map((pal) => (
                <button
                  key={pal.id}
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, palette: pal.id as ThemePalette },
                    }))
                  }
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    settings.theme.palette === pal.id
                      ? 'bg-[#143e47] border-[#48e4ff] text-white shadow-lg'
                      : 'bg-[#091a1e] border-[#142a30] text-[#789d9a] hover:text-white'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-2 shadow-md"
                    style={{ background: pal.hex }}
                  />
                  <div className="text-xs font-bold">{pal.label}</div>
                </button>
              ))}
            </div>

            {/* Visualizer Style */}
            <div className="pt-4 border-t border-[#11242a]">
              <div className="text-xs font-bold text-white mb-3">Live Visualizer Engine</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bars', label: 'Spectral Bars' },
                  { id: 'wave', label: 'Oscilloscope Wave' },
                  { id: 'cyber-vu', label: 'Cyber VU LEDs' },
                ].map((vis) => (
                  <button
                    key={vis.id}
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, visualizerStyle: vis.id as VisualizerStyle },
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.theme.visualizerStyle === vis.id
                        ? 'bg-[#143e47] border-[#48e4ff]/50 text-white shadow-sm'
                        : 'bg-[#091a1e] border-[#142a30] text-[#789d9a] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{vis.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Vault Storage */}
      {activeSection === 'storage' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-[#061013] border border-[#1a3840]">
            <h3 className="text-lg font-serif font-bold text-white mb-1">IndexedDB Vault Metrics</h3>
            <p className="text-xs text-[#789d9a] mb-6">
              Export complete JSON library snapshots or manage client storage quotas.
            </p>

            {/* Storage Meter */}
            <div className="p-4 rounded-2xl bg-[#091a1e] border border-[#142a30] mb-6">
              <div className="flex items-center justify-between text-xs font-mono text-[#8aaeb5] mb-2">
                <span>Vault Usage: {storageMetrics.usageMB} MB</span>
                <span>Quota: {storageMetrics.quotaMB} MB ({storageMetrics.percent}%)</span>
              </div>
              <div className="w-full h-2 bg-[#061013] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#48e4ff]"
                  style={{ width: `${Math.min(100, parseFloat(storageMetrics.percent))}%` }}
                />
              </div>
            </div>

            {/* Backup Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleExportVault}
                className="p-4 rounded-2xl bg-[#091a1e] hover:bg-[#112a32] border border-[#1a3840] text-left transition-all group"
              >
                <Download size={20} className="text-[#48e4ff] mb-2 group-hover:-translate-y-0.5 transition-transform" />
                <div className="text-xs font-bold text-white">Export Vault Backup</div>
                <div className="text-[11px] text-[#789d9a] mt-0.5">Download full JSON library catalog</div>
              </button>

              <button
                onClick={onWipeVault}
                className="p-4 rounded-2xl bg-[#1c0e12] hover:bg-[#281318] border border-[#4d1f27] text-left transition-all group"
              >
                <Trash2 size={20} className="text-[#f43f5e] mb-2 group-hover:scale-105 transition-transform" />
                <div className="text-xs font-bold text-[#f43f5e]">Wipe Offline Vault</div>
                <div className="text-[11px] text-[#8a5059] mt-0.5">Clears all stored tracks & playlists</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
