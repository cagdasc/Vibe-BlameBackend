/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TerminalTui } from './components/TerminalTui';
import { CliStreamView } from './components/CliStreamView';
import { RequestSimulator } from './components/RequestSimulator';
import { CustomDispatcher } from './components/CustomDispatcher';
import { CodeExplorer } from './components/CodeExplorer';
import { AdbGuide } from './components/AdbGuide';
import { NetworkEvent, DeviceInfo } from './types/inspector';
import { simulator } from './engine/mockClient';
import { liveSocketClient } from './engine/liveSocketClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tui' | 'cli' | 'scenarios' | 'dispatcher' | 'code' | 'guide'>('tui');
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceModel: 'Google Pixel 8 Pro',
    androidVersion: 'Android 15 (API 35)',
    appPackage: 'com.example.sample',
    appVersion: '1.0.0-debug',
    connectedAt: Date.now(),
    port: 10245
  });

  // Seed initial realistic events on load and listen to both real ADB bridge and simulator
  useEffect(() => {
    let isMounted = true;

    const handleNewEvent = (event: NetworkEvent) => {
      if (!isMounted) return;
      setEvents((prev) => {
        const index = prev.findIndex((e) => e.id === event.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = event;
          return updated;
        } else {
          return [...prev, event];
        }
      });
    };

    // 1. Listen to live simulator events
    const unsubSim = simulator.subscribe(handleNewEvent);

    // 2. Connect to real ADB TCP bridge
    liveSocketClient.connect();
    const unsubLiveEvents = liveSocketClient.onNetworkEvent(handleNewEvent);
    const unsubLiveDevice = liveSocketClient.onDevice((dev: any) => {
      if (!isMounted) return;
      setDeviceInfo({
        deviceModel: dev.deviceModel || 'Connected Android Device',
        androidVersion: dev.androidVersion || 'Android',
        appPackage: dev.appPackage || 'com.example.app',
        appVersion: dev.appVersion || 'debug',
        connectedAt: Date.now(),
        port: 10245
      });
      setIsConnected(true);
    });
    const unsubLiveStatus = liveSocketClient.onStatus((status: boolean) => {
      if (!isMounted) return;
      if (status) setIsConnected(true);
    });

    // Fire initial requests to populate the inspector
    const initSeed = async () => {
      await simulator.triggerOkHttpUserList();
      await simulator.triggerOkHttpPayment();
      await simulator.triggerKtorNotFound();
      await simulator.triggerOkHttpBinary();
    };

    initSeed();

    return () => {
      isMounted = false;
      unsubSim();
      unsubLiveEvents();
      unsubLiveDevice();
      unsubLiveStatus();
    };
  }, []);

  const handleClear = () => {
    setEvents([]);
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0e14] text-neutral-100 font-sans">
      {/* Strict 3-Zone Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        deviceInfo={deviceInfo}
        isConnected={isConnected}
        onToggleConnection={() => setIsConnected(!isConnected)}
        eventCount={events.length}
        onClearEvents={handleClear}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'tui' && (
          <TerminalTui
            events={events}
            selectedId={selectedId}
            onSelectEvent={setSelectedId}
            onClear={handleClear}
          />
        )}

        {activeTab === 'cli' && (
          <CliStreamView
            events={events}
            onSelectEvent={(id) => {
              setSelectedId(id);
              setActiveTab('tui');
            }}
            onClear={handleClear}
          />
        )}

        {activeTab === 'scenarios' && (
          <RequestSimulator
            onEventTriggered={() => {
              // Optionally user can switch to TUI to view, or remain in scenarios
            }}
          />
        )}

        {activeTab === 'dispatcher' && (
          <CustomDispatcher
            onDispatched={() => {
              setActiveTab('tui');
            }}
          />
        )}

        {activeTab === 'code' && <CodeExplorer />}

        {activeTab === 'guide' && <AdbGuide />}
      </main>
    </div>
  );
}
