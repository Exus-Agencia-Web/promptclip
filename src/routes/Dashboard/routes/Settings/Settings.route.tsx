import { useState, useEffect, useContext } from 'react';
import {
  Text, Switch, Button, Box, Divider, Link,
} from '@chakra-ui/react';
import { invoke } from '@tauri-apps/api';
import { open as openExternal } from '@tauri-apps/api/shell';
import { store, updateShortcut } from '../../../../utils/utils';
import { AppUpdateContext } from '../../../../contexts/appUpdate.context';

const Settings = () => {
  const [shortcut, setShortcut] = useState('');
  const [launchOnLogin, setLaunchOnLogin] = useState(false);
  const [isListening, setIsListening] = useState(false);
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

  return (
    <div>
      <Text fontWeight="bold">Settings</Text>

      <Box display="flex" alignItems="center" mt="4">
        <Text mr="4">Change Shortcut:</Text>
        <Button
          borderWidth="1px"
          borderRadius="4px"
          p="2"
          onClick={handleShortcutChange}
        >
          {isListening ? 'Listening...' : shortcut
            .replace('Meta', '⌘')
            .replace('Command', '⌘')
            .replace('Control', '⌃')
            .replace('Alt', '⌥')
            .replace('Shift', '⇧')
            .toUpperCase() || 'Press a key...'}
        </Button>
      </Box>

      <Box display="flex" alignItems="center" mt="4">
        <Text mr="4">Launch on Login:</Text>
        <Switch
          isChecked={launchOnLogin}
          onChange={handleLaunchOnLoginChange}
        />
      </Box>

      <Divider
        mt="10"
        mb="4"
        borderColor="rgba(255, 255, 255, 0.1)"
      />

      <Box mb="6">
        <Text fontWeight="bold" mb="2">Actualizaciones</Text>

        {checkState === 'checking' && (
          <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px">
            Buscando actualizaciones…
          </Text>
        )}

        {checkState === 'error' && (
          <Text color="#F56565" fontSize="13px">
            No se pudo verificar actualizaciones
            {errorMessage ? `: ${errorMessage}` : '.'}
          </Text>
        )}

        {checkState === 'ok' && updateStatus && !updateStatus.updateAvailable && (
          <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px">
            Estás usando la última versión disponible (
            {updateStatus.currentVersion}
            ).
          </Text>
        )}

        {checkState === 'ok' && updateStatus && updateStatus.updateAvailable && (
          <>
            <Text color="#68D391" fontSize="13px" mb="2">
              Nueva versión disponible:
              {' '}
              <strong>{updateStatus.latestVersion}</strong>
              {' '}
              (tienes {updateStatus.currentVersion}).
            </Text>
            <Button
              size="sm"
              colorScheme="green"
              onClick={() => openExternal(updateStatus.downloadUrl)}
            >
              Descargar actualización
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
          Volver a comprobar
        </Button>
      </Box>

      <Divider
        mb="4"
        borderColor="rgba(255, 255, 255, 0.1)"
      />

      <Box>
        <Text fontWeight="bold" mb="2">Agradecimientos</Text>
        <Text color="rgba(255, 255, 255, 0.7)" fontSize="13px" mb="2">
          PromptClip fue construido usando las siguientes tecnologías y librerías:
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
          Mantenimiento y mejoras por{' '}
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
