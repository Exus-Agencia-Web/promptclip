import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Store } from 'tauri-plugin-store-api';
import { register, unregister } from '@tauri-apps/api/globalShortcut';
import { createPromptsTable } from './database';
import { createDashboardWindow, getDashboardWindow, getSearchWindow } from './window';
import { IPrompt } from '../types/Prompt.types';
import i18n, { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n';

export const store = new Store('.settings.dat');

const loadLanguagePreference = async () => {
  const saved = (await store.get('language')) as SupportedLanguage | null;
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    if (i18n.language !== saved) {
      await i18n.changeLanguage(saved);
    }
  }
};

export const listenForHotkey = async (shortcut: string) => {
  const searchWindow = getSearchWindow()!;
  await register(shortcut, async () => {
    if (await searchWindow.isFocused()) {
      await searchWindow.hide();
    } else {
      await searchWindow.show();
      await searchWindow.center();
      await searchWindow.setFocus();
    }
  });
};

const createSettings = async () => {
  if (!(await store.get('shortcut'))) {
    await store.set('shortcut', 'Command+Shift+G');
    await store.set('launch_on_login', true);
    await store.save();
  }
};

export const updateShortcut = async (shortcut: string) => {
  unregister(await store.get('shortcut') as string);
  await store.set('shortcut', shortcut);
  await store.save();
  await listenForHotkey(shortcut);
};

export const initialiseApp = async () => {
  await createPromptsTable();
  await createSettings();
  await loadLanguagePreference();
  await invoke('init_ns_panel', {
    appShortcut: await store.get('shortcut'),
  });
  createDashboardWindow();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      appWindow.hide();
    }
  });

  document.onkeyup = (event) => {
    if (event.metaKey && event.key === 'n') {
      getDashboardWindow()?.show();
      getDashboardWindow()?.setFocus();
      getDashboardWindow()?.emit('newPrompt');
    }
  };

  document.onblur = async () => {
    await appWindow.hide();
  };

  await listen('showDashboard', async () => {
    const dashboard = getDashboardWindow();
    if (dashboard) {
      await dashboard.show();
      await dashboard.setFocus();
    }
  });

  await invoke('launch_on_login', {
    enable: await store.get('launch_on_login'),
  });
};

export const filterPrompts = (prompts: IPrompt[], searchInput: string): IPrompt[] => {
  const filteredPrompts = prompts.filter((prompt) => {
    const promptNameMatches = prompt.promptName.toLowerCase().includes(searchInput.toLowerCase());
    const promptMatches = prompt.prompt.toLowerCase().includes(searchInput.toLowerCase());
    return promptNameMatches || promptMatches;
  });

  return filteredPrompts;
};
