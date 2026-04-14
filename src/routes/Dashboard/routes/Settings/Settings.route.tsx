import { useState, useEffect, useContext } from 'react';
import {
  Text, Switch, Button, Box, Divider, Link, Select,
} from '@chakra-ui/react';
import { invoke } from '@tauri-apps/api';
import { open as openExternal } from '@tauri-apps/api/shell';
import { useTranslation } from 'react-i18next';
import { store, updateShortcut } from '../../../../utils/utils';
import { AppUpdateContext } from '../../../../contexts/appUpdate.context';
import { SupportedLanguage, SUPPORTED_LANGUAGES, setLanguage } from '../../../../i18n';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [shortcut, setShortcut] = useState('');
  const [launchOnLogin, setLaunchOnLogin] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    (i18n.language?.startsWith('es') ? 'es' : 'en') as SupportedLanguage,
  );
  const {
    status: updateStatus,
    checkState,
    errorMessage,
    refresh: refreshUpdate,
  } = useContext(AppUpdateContext);

  useEffect(() => {
    const fetchData = async () => {
      setShortcut(await store.get('shortcut') || '');
      setLaunchOnLogin(await store.get('launch_on_login') || false);
      const storedLang = (await store.get('language')) as SupportedLanguage | null;
      if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
        setCurrentLanguage(storedLang);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (isListening) {
        event.preventDefault();
        const {
          key, ctrlKey, altKey, shiftKey, metaKey,
        } = event;

        if (key !== 'Control' && key !== 'Alt' && key !== 'Shift' && key !== 'Meta') {
          let shortcutString = '';

          if (ctrlKey) shortcutString += 'Ctrl+';
          if (altKey) shortcutString += 'Alt+';
          if (shiftKey) shortcutString += 'Shift+';
          if (metaKey) shortcutString += 'Command+';

          shortcutString += key;
          setShortcut(shortcutString);
          setIsListening(false);
          updateShortcut(shortcutString);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isListening]);

  const handleShortcutChange = () => {
    setShortcut('');
    setIsListening(true);
  };

  const handleLaunchOnLoginChange = async (event: any) => {
    const { checked } = event.target;
    setLaunchOnLogin(checked);
    await store.set('launch_on_login', checked);
    await invoke('launch_on_login', {
      enable: checked,
    });
    store.save();
  };

  const handleLanguageChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLanguage;
    if (!SUPPORTED_LANGUAGES.includes(next)) return;
    setCurrentLanguage(next);
    await setLanguage(next);
    await store.set('language', next);
    await store.save();
  };

  return (
    <div>
      <Text fontWeight="bold">{t('settings.title')}</Text>

      <Box display="flex" alignItems="center" mt="4">
        <Text mr="4">{t('settings.changeShortcut')}</Text>
        <Button
          borderWidth="1px"
          borderRadius="4px"
          p="2"
          onClick={handleShortcutChange}
        >
          {isListening ? t('settings.listening') : shortcut
            .replace('Meta', '⌘')
            .replace('Command', '⌘')
            .replace('Control', '⌃')
            .replace('Alt', '⌥')
            .replace('Shift', '⇧')
            .toUpperCase() || t('settings.pressKey')}
        </Button>
      </Box>

      <Box display="flex" alignItems="center" mt="4">
        <Text mr="4">{t('settings.launchOnLogin')}</Text>
        <Switch
          isChecked={launchOnLogin}
          onChange={handleLaunchOnLoginChange}
        />
      </Box>

      <Box display="flex" alignItems="center" mt="4">
        <Text mr="4">{t('settings.language')}</Text>
        <Select
          value={currentLanguage}
          onChange={handleLanguageChange}
          width="auto"
          size="sm"
          color="white"
          style={{
            borderRadius: '7px',
            border: '0.5px solid rgba(255, 255, 255, 0.10)',
            background: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <option value="en">{t('settings.languageEnglish')}</option>
          <option value="es">{t('settings.languageSpanish')}</option>
        </Select>
      </Box>

      <Divider
        mt="10"
        mb="4"
        borderColor="rgba(255, 255, 255, 0.1)"
      />

      <Box mb="6">
        <Text fontWeight="bold" mb="2">{t('settings.updatesTitle')}</Text>

        {checkState === 'checking' && (
          <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px">
            {t('settings.checking')}
          </Text>
        )}

        {checkState === 'error' && (
          <Text color="#F56565" fontSize="13px">
            {t('settings.checkFailed')}
            {errorMessage ? `: ${errorMessage}` : '.'}
          </Text>
        )}

        {checkState === 'ok' && updateStatus && !updateStatus.updateAvailable && (
          <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px">
            {t('settings.upToDate', { version: updateStatus.currentVersion })}
          </Text>
        )}

        {checkState === 'ok' && updateStatus && updateStatus.updateAvailable && (
          <>
            <Text color="#68D391" fontSize="13px" mb="2">
              {t('settings.updateAvailable', {
                latest: updateStatus.latestVersion,
                current: updateStatus.currentVersion,
              })}
            </Text>
            <Button
              size="sm"
              colorScheme="green"
              onClick={() => openExternal(updateStatus.downloadUrl)}
            >
              {t('settings.downloadUpdate')}
            </Button>
          </>
        )}

        <Button
          size="xs"
          variant="ghost"
          color="rgba(255, 255, 255, 0.5)"
          mt="2"
          onClick={() => refreshUpdate()}
          isDisabled={checkState === 'checking'}
        >
          {t('settings.checkAgain')}
        </Button>
      </Box>

      <Divider
        mb="4"
        borderColor="rgba(255, 255, 255, 0.1)"
      />

      <Box>
        <Text fontWeight="bold" mb="2">{t('settings.acknowledgements')}</Text>
        <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px" mb="2">
          {t('settings.builtWith')}
        </Text>
        <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px">
          •{' '}
          <Link href="https://tauri.app/" isExternal color="#A0AEC0">
            Tauri
          </Link>
        </Text>
        <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px">
          •{' '}
          <Link href="https://reactjs.org/" isExternal color="#A0AEC0">
            React
          </Link>
        </Text>
        <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px">
          •{' '}
          <Link href="https://chakra-ui.com/" isExternal color="#A0AEC0">
            Chakra UI
          </Link>
        </Text>
        <Text color="rgba(255, 255, 255, 0.5)" fontSize="12px" mt="4">
          {t('settings.maintainedBy')}
          {' '}
          <Link href="https://herduin.com" isExternal color="#A0AEC0" fontWeight="bold">
            Herduin Rivera
          </Link>
          .
        </Text>
      </Box>
    </div>
  );
};

export default Settings;
