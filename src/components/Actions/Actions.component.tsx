import React from 'react';
import { Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import CustomIconButton from '../CustomIconButton/CustomIconButton.component';

type ActionOptionProps = {
  text: string;
  iconText: string | string[];
  dark?: boolean;
  marginTop?: string;
};

const ActionOption: React.FC<ActionOptionProps> = ({
  text, iconText, dark = false, marginTop,
}) => {
  const renderIcon = () => {
    if (typeof iconText === 'string') {
      return <CustomIconButton iconText={iconText} dark={dark} />;
    }
    if (Array.isArray(iconText)) {
      return (
        <>
          {iconText.map((icon, index) => (
            <CustomIconButton key={index} iconText={icon} dark={dark} />
          ))}
        </>
      );
    }
    return null;
  };

  return (
    <Flex width="fit-content" justifyContent="space-between" alignItems="center">
      <Text
        color="#CECECE"
        fontSize="12px"
        fontWeight="normal"
        marginRight="2"
        marginTop={marginTop}
      >
        {text}
      </Text>
      {renderIcon()}
    </Flex>
  );
};

// TODO: Reduce the space taken by Actions component
const Actions: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '10px',
      }}
    >
      <Flex width="680px" justifyContent="space-between" alignItems="center">
        <Text fontWeight="bold" fontSize="xs" color="#7D7A75">
          {t('search.actionsLabel')}
        </Text>

        <div
          style={{
            display: 'flex',
            gap: '20px',
          }}
        >
          <ActionOption text={t('search.copySelected')} iconText="↵" dark marginTop="4px" />
          <ActionOption text={t('search.newPrompt')} iconText={['⌘', 'N']} dark />
        </div>
      </Flex>
    </div>
  );
};

export default Actions;
