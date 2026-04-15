import React from 'react';
import { getIconComponentOrDefault } from './iconMap';

interface PromptIconProps {
  name: string | null | undefined;
  size?: number;
  color?: string;
}

const PromptIcon: React.FC<PromptIconProps> = ({ name, size = 20, color = 'white' }) => {
  const Component = getIconComponentOrDefault(name);
  return <Component size={size} color={color} />;
};

export default PromptIcon;
