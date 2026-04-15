import React from 'react';
import { Button, Flex, Text } from '@chakra-ui/react';
import { appWindow } from '@tauri-apps/api/window';
import CustomIconButton from '../CustomIconButton/CustomIconButton.component';
import { incrementUsageAndSetLastUsed } from '../../utils/database';
import { IPrompt } from '../../types/Prompt.types';
import PromptIcon from '../IconPicker/PromptIcon.component';

interface IPromptProps extends IPrompt {
  index: number;
}

const copyToClipboard = async (value: string) => {
  await navigator.clipboard.writeText(value);
  await appWindow.hide();
};

const PromptButton: React.FC<IPromptProps> = ({
  uuid, prompt, promptName, index, icon,
}) => {
  const handleButtonClick = () => {
    copyToClipboard(prompt);
    incrementUsageAndSetLastUsed(uuid);
  };

  return (
    <Button
      className="prompt-button"
      width="100%"
      height="42px"
      px={3}
      py={5}
      justifyContent="space-between"
      alignItems="center"
      borderRadius="10px"
      bg="transparent"
      color="white"
      onClick={handleButtonClick}
      margin="5px 0"
      _hover={{ bg: '#1B1A1D' }}
      _focus={{ bg: '#1B1A1D', outline: 'none', boxShadow: 'none' }}
      id={uuid.toString()}
    >
      <Flex align="center">
        <Flex width="24px" height="24px" align="center" justify="center" color="white">
          <PromptIcon name={icon} size={18} />
        </Flex>
        <Text ml={2}>{promptName}</Text>
      </Flex>
      <Flex>
        <CustomIconButton iconText="⌘" dark />
        <CustomIconButton dark iconText={index.toString()} />
      </Flex>
    </Button>
  );
};

export default PromptButton;
