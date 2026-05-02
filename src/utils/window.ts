import { invoke } from '@tauri-apps/api';
import { appWindow, LogicalSize, WebviewWindow } from '@tauri-apps/api/window';

const configureWindow = async () => {
  await appWindow.center();
  await appWindow.show();
  await appWindow.setFocus();
};

export const setWindowSize = async (width: number, height: number) => {
  await appWindow.setSize(new LogicalSize(width, height));
};

export const switchToApp = async () => {
  await setWindowSize(728, 646);
  await configureWindow();
};

export const setWindowSizeToBody = async () => {
  const { body } = document;
  await appWindow.setSize(new LogicalSize(body.clientWidth, body.clientHeight));
};

let dashboardPolicyRegular = false;

export const isDashboardPolicyRegular = (): boolean => dashboardPolicyRegular;

export const setDashboardVisible = async (visible: boolean) => {
  dashboardPolicyRegular = visible;
  try {
    await invoke('set_dashboard_visible', { visible });
  } catch {
    // ignore — macOS only
  }
};

const centerDashboardOnCursorMonitor = async () => {
  try {
    await invoke('center_window_on_cursor_monitor', { label: 'dashboard' });
  } catch {
    // non-macOS or command unavailable — fall back to primary monitor center
    const dash = WebviewWindow.getByLabel('dashboard');
    if (dash) await dash.center();
  }
};

export const showDashboardWindow = async () => {
  const dash = WebviewWindow.getByLabel('dashboard');
  if (!dash) return;
  await setDashboardVisible(true);
  await dash.show();
  await centerDashboardOnCursorMonitor();
  await dash.setFocus();
};

export const hideDashboardWindow = async () => {
  const dash = WebviewWindow.getByLabel('dashboard');
  if (!dash) return;
  await dash.hide();
  await setDashboardVisible(false);
};

export const createDashboardWindow = async () => {
  const DashboardWindow = new WebviewWindow('dashboard', {
    url: '/dashboard',
    title: 'PromptClip',
    resizable: true,
    minHeight: 722,
    minWidth: 1000,
    maximizable: true,
    transparent: true,
    decorations: false,
  });
  await invoke('apply_vibrancy_to_dashboard', {
    window: DashboardWindow,
  });
  DashboardWindow.setSize(new LogicalSize(1000, 722));
  DashboardWindow.center();
  DashboardWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    await DashboardWindow.hide();
    await setDashboardVisible(false);
  });
};

export const getDashboardWindow = () => WebviewWindow.getByLabel('dashboard');
export const getSearchWindow = () => WebviewWindow.getByLabel('search');
