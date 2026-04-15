import React, { CSSProperties } from 'react';
import { Textarea, TextareaProps } from '@chakra-ui/react';

interface InputProps extends Omit<TextareaProps, 'size'> {
  containerStyle?: CSSProperties;
  size?: 'sm' | 'md' | 'lg' | 'xs';
  multiline?: boolean;
  fillHeight?: boolean;
}

const CustomInput: React.FC<InputProps> = ({
  containerStyle, size, multiline, fillHeight, rows, ...rest
}) => {
  const mergedContainerStyle: CSSProperties = {
    display: 'flex',
    padding: '10px 12px',
    alignItems: 'center',
    gap: '8px',
    alignSelf: 'stretch',
    borderRadius: '7px',
    border: '0.5px solid var(--dark-quaternary, rgba(255, 255, 255, 0.10))',
    background: 'rgba(255, 255, 255, 0.05)',
    ...(fillHeight ? { height: '100%', minHeight: 0 } : {}),
    ...containerStyle,
  };

  const resolvedRows = rows ?? (multiline ? 5 : 1);

  return (
    <Textarea
      size={size}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      {...rest}
      style={mergedContainerStyle}
      _placeholder={{ color: '#667085' }}
      resize={fillHeight ? 'none' : multiline ? 'vertical' : 'none'}
      rows={fillHeight ? undefined : resolvedRows}
    />
  );
};

export default CustomInput;
