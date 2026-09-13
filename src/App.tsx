import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { StationSubheader } from './components/StationSubheader';
import { ScenarioControls } from './components/ScenarioControls';
import { SourceMixCard } from './components/SourceMixCard';
import { LoadForecastChart } from './components/LoadForecastChart';
import { BatteryCard } from './components/BatteryCard';
import { DieselHealthCard } from './components/DieselHealthCard';
import { AlertBanner } from './components/AlertBanner';
import { ScheduleMatrixChart } from './components/ScheduleMatrixChart';
import { AllocationTimeline } from './components/AllocationTimeline';
import { DiagnosticsView } from './components/DiagnosticsView';
import { BESSCellDegradationCard } from './components/BESSCellDegradationCard';
import { PVSiliconDegradationCard } from './components/PVSiliconDegradationCard';
import { AppearanceModal } from './components/AppearanceModal';
import { useAppearance } from './hooks/useAppearance';
import { hexToRgb } from './utils/colorUtils';
import {
  StatusResponse,
  ScheduleResponse,
  DataSourceMode,
  TelemetryMetrics,
} from './types';
import {
  fetchStatus,
  fetchSchedule,
  getTelemetryForMode,
  POLL_INTERVAL_MS,
  API_BASE_URL,
} from './services/api';
import { LiveWeatherData } from './services/weatherService';
import {
  mockNormalStatus,
  mockNormalSchedule,
  normalTelemetry,
} from './mock/mockData';

export const App: React.FC = () => {
  // Application states (Defaults to real-time live weather search for Maitri Station)
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('live-weather');
  const [statusData, setStatusData] = useState<StatusResponse>(mockNormalStatus);
  const [scheduleData, setScheduleData] = useState<ScheduleResponse>(mockNormalSchedule);
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>(normalTelemetry);
  const [weatherMetadata, setWeatherMetadata] = useState<LiveWeatherData | undefined>(undefined);
  const [isMockFallback, setIsMockFallback] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState<number>(POLL_INTERVAL_MS / 1000);

  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<string>('telemetry');
  const [currentSubView, setCurrentSubView] = useState<string>('overview');
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState<boolean>(false);

  // Appearance & Branding State (Custom Background & Custom Logo & Styling)
  const {
    appearance,
    updateAppearance,
    resetAppearance,
  } = useAppearance();

  // Dynamic CSS variables for tile, header, and element styling
  const customStyles = {
    '--hud-card-bg-rgb': hexToRgb(appearance.cardBgColor || '#1e1e1e'),
    '--hud-card-opacity': (appearance.cardOpacity ?? 65) / 100,
    '--hud-card-blur': `${appearance.cardBlur ?? 16}px`,
    '--hud-card-border-opacity': (appearance.cardBorderOpacity ?? 8) / 100,
    '--hud-header-bg-rgb': hexToRgb(appearance.headerBgColor || '#1e1e1e'),
    '--hud-header-opacity': (appearance.headerOpacity ?? 85) / 100,
    '--hud-header-blur': `${appearance.headerBlur ?? 16}px`,
    '--hud-accent': appearance.accentColor || '#00f0ff',
    '--hud-subpanel-rgb': hexToRgb(appearance.subpanelBgColor || '#ffffff'),
    '--hud-subpanel-opacity': (appearance.subpanelOpacity ?? 4) / 100,
  } as React.CSSProperties;

  // Polling timer ref
  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Load telemetry & data
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, scheduleRes] = await Promise.all([
        fetchStatus(dataSourceMode),
        fetchSchedule(dataSourceMode),
      ]);

      setStatusData(statusRes.data);
      setScheduleData(scheduleRes.data);
      setIsMockFallback(Boolean(statusRes.error || scheduleRes.error));
      
      const liveWeather = statusRes.weatherMetadata || scheduleRes.weatherMetadata;
      if (liveWeather) {
        setWeatherMetadata(liveWeather);
      }

      setTelemetry(getTelemetryForMode(dataSourceMode, statusRes.data.severity, liveWeather));
      setLastFetchTime(new Date());
    } catch (e) {
      console.error('Data sync failed:', e);
    } finally {
      setIsRefreshing(false);
      setSecondsUntilNextPoll(POLL_INTERVAL_MS / 1000);
    }
  }, [dataSourceMode]);

  // Polling effect
  useEffect(() => {
    loadData();

    // Set 30s polling
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      loadData();
    }, POLL_INTERVAL_MS);

    // Set 1s countdown tick
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setSecondsUntilNextPoll((prev) => (prev > 1 ? prev - 1 : POLL_INTERVAL_MS / 1000));
    }, 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [loadData]);

  // Emergency override handler
  const handleEmergencyOverride = () => {
    if (statusData.severity === 'emergency') {
      // Revert to normal
      setDataSourceMode('mock-normal');
    } else {
      // Force blizzard/emergency
      setDataSourceMode('mock-blizzard');
    }
  };

  return (
    <div
      style={customStyles}
      className={`min-h-screen bg-[#1e1e1e] text-slate-100 flex flex-col relative ${!appearance.customBg ? 'polar-grid-bg' : ''}`}
    >
      {/* Dynamic Custom Dashboard Background Layer */}
      {appearance.customBg && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-no-repeat transition-all duration-500 ease-out"
            style={{
              backgroundImage: `url(${appearance.customBg})`,
              backgroundSize: appearance.bgFit,
              backgroundPosition: 'center',
              filter: appearance.bgBlur > 0 ? `blur(${appearance.bgBlur}px)` : 'none',
              transform: appearance.bgBlur > 0 ? 'scale(1.04)' : 'none', // Prevents blurry edge bleed
            }}
          />
          {/* Adjustable Dark Overlay to ensure SCADA data contrast */}
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{ opacity: appearance.bgOverlayOpacity / 100 }}
          />
          {/* Subtle Polar Grid Texture over wallpaper for authentic SCADA feel */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          />
        </div>
      )}

      {/* Main Content Container with higher z-index */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 1. Main Header with Station ID & Real-time Telemetry Bar */}
        <Header
          telemetry={telemetry}
          severity={statusData.severity}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          onEmergencyOverride={handleEmergencyOverride}
          appearance={appearance}
          onOpenAppearanceModal={() => setIsAppearanceModalOpen(true)}
        />

        {/* 2. Secondary Subheader with Polar Ops Phase & Badges */}
        <StationSubheader
          currentView={currentSubView}
          onSelectView={setCurrentSubView}
          telemetry={telemetry}
          onOpenAppearanceModal={() => setIsAppearanceModalOpen(true)}
        />

        {/* 3. Scenario & Demo Control Bar (Switch Normal / Blizzard / Live API) */}
        <ScenarioControls
          dataSourceMode={dataSourceMode}
          onSelectMode={setDataSourceMode}
          isMockFallback={isMockFallback}
          lastFetchTime={lastFetchTime}
          secondsUntilNextPoll={secondsUntilNextPoll}
          weatherMetadata={weatherMetadata}
        />

        {/* 4. Dashboard Workspace Grid */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5 max-w-[1720px] w-full mx-auto space-y-4">
          {/* Conditional Tab Rendering */}
          {activeTab === 'diagnostics' ? (
            <div className="space-y-4">
              <DiagnosticsView
                telemetry={telemetry}
                battery={statusData.battery}
                dieselHealth={statusData.diesel_health}
                severity={statusData.severity}
              />
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BESSCellDegradationCard
                  battery={statusData.battery}
                  telemetry={telemetry}
                />
                <PVSiliconDegradationCard
                  telemetry={telemetry}
                />
              </section>
            </div>
          ) : activeTab === 'alerts' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AlertBanner
                severity={statusData.severity}
                restockDaysRemaining={statusData.restock_days_remaining}
              />
              <AllocationTimeline schedule={scheduleData} />
            </div>
          ) : (
            <>
              {currentSubView === 'forecast' ? (
                /* Focused Forecast Detail View */
                <div className="space-y-4">
                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-12">
                      <LoadForecastChart
                        mode={dataSourceMode}
                        telemetry={telemetry}
                      />
                    </div>
                  </section>
                  <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <PVSiliconDegradationCard
                      telemetry={telemetry}
                    />
                    <ScheduleMatrixChart
                      schedule={scheduleData}
                      mode={dataSourceMode}
                    />
                  </section>
                </div>
              ) : currentSubView === 'history' ? (
                /* Focused Allocation History View */
                <div className="space-y-4">
                  <ScheduleMatrixChart
                    schedule={scheduleData}
                    mode={dataSourceMode}
                  />
                  <AllocationTimeline
                    schedule={scheduleData}
                  />
                </div>
              ) : (
                /* Full Executive Overview (Active) */
                <>
                  {/* Top Row: Current Generation Dispatch (Left) + Predictive Energy Modeling (Right) */}
                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-5">
                      <SourceMixCard
                        currentHourData={scheduleData[0]}
                        peakCapacity={telemetry.peakCapacity}
                      />
                    </div>

                    <div className="lg:col-span-7">
                      <LoadForecastChart
                        mode={dataSourceMode}
                        telemetry={telemetry}
                        scheduleData={scheduleData}
                      />
                    </div>
                  </section>

                  {/* Middle Row: BESS Storage (Left) + Diesel Gen (Center) + Priority Operational Alerts (Right) */}
                  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <BatteryCard
                      battery={statusData.battery}
                      telemetry={telemetry}
                    />

                    <DieselHealthCard
                      dieselHealth={statusData.diesel_health}
                      restockDaysRemaining={statusData.restock_days_remaining}
                      telemetry={telemetry}
                    />

                    <AlertBanner
                      severity={statusData.severity}
                      restockDaysRemaining={statusData.restock_days_remaining}
                    />
                  </section>

                  {/* Degradation Asset Diagnostics Row: BESS Cell Degradation (Left) + PV Silicon Degradation (Right) */}
                  <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <BESSCellDegradationCard
                      battery={statusData.battery}
                      telemetry={telemetry}
                    />
                    <PVSiliconDegradationCard
                      telemetry={telemetry}
                    />
                  </section>

                  {/* Bottom Row: Historical Telemetry Matrix (72H / 12H Schedule) */}
                  <section className="space-y-4">
                    <ScheduleMatrixChart
                      schedule={scheduleData}
                      mode={dataSourceMode}
                    />

                    {/* Allocation History Log (Newest First) */}
                    <AllocationTimeline
                      schedule={scheduleData}
                    />
                  </section>
                </>
              )}
            </>
          )}
        </main>

        {/* Footer System Status */}
        <footer className="bg-[#181818]/80 backdrop-blur-md border-t border-white/10 px-4 py-2.5 text-[10px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-slate-300 font-semibold">{appearance.stationName.toUpperCase()} SCADA v4.8.19-POLAR</span>
            <span>•</span>
            <span>MAITRI ANTARCTIC STATION MICROGRID</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">SECURITY KERNEL: SECURE ENCLAVE ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
            <span>API TARGET: <code className="text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">{API_BASE_URL}</code></span>
          </div>
        </footer>
      </div>

      {/* Theme & Customization Studio Modal */}
      <AppearanceModal
        isOpen={isAppearanceModalOpen}
        onClose={() => setIsAppearanceModalOpen(false)}
        appearance={appearance}
        onUpdateAppearance={updateAppearance}
        onReset={resetAppearance}
      />
    </div>
  );
};
export default App;


