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
import { DeviceManager } from './components/DeviceManager';
import { NetworkEvent, DeviceInfo } from './types/inspector';
import { liveSocketClient } from './engine/liveSocketClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tui' | 'cli' | 'scenarios' | 'dispatcher' | 'devices'>('tui');
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceModel: 'Waiting for device...',
    androidVersion: 'Android',
    appPackage: '',
    appVersion: '',
    connectedAt: Date.now(),
    port: 10245
  });

  // Listen to live ADB TCP socket stream
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

    // Connect to real ADB TCP bridge
    liveSocketClient.connect();
    const unsubLiveEvents = liveSocketClient.onNetworkEvent(handleNewEvent);
    const unsubLiveDevice = liveSocketClient.onDevice((dev: any) => {
      if (!isMounted) return;
      setDeviceInfo({
        deviceModel: dev.deviceModel || 'Connected Android Device',
        androidVersion: dev.androidVersion || 'Android',
        appPackage: dev.appPackage || 'com.cacaosd.blamebackend',
        appVersion: dev.appVersion || 'debug',
        connectedAt: Date.now(),
        port: dev.port || 10245
      });
      setIsConnected(true);
    });
    const unsubLiveStatus = liveSocketClient.onStatus((status: boolean) => {
      if (!isMounted) return;
      setIsConnected(status);
    });

    return () => {
      isMounted = false;
      unsubLiveEvents();
      unsubLiveDevice();
      unsubLiveStatus();
    };
  }, []);

  const handleClear = () => {
    setEvents([]);
    setSelectedId(null);
  };

  const handleReconnectSocket = async () => {
    try {
      await fetch('/api/adb/reconnect', { method: 'POST' });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0e14] text-neutral-100 font-sans">
      {/* Strict 3-Zone Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        deviceInfo={deviceInfo}
        isConnected={isConnected}
        onToggleConnection={() => setActiveTab('devices')}
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
              // User can trigger simulated requests
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

        {activeTab === 'devices' && (
          <DeviceManager
            currentDeviceInfo={deviceInfo}
            isSocketConnected={isConnected}
            onRefreshSocket={handleReconnectSocket}
          />
        )}
      </main>
    </div>
  );
}
