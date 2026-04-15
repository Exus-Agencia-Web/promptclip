import React, { useMemo, useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  IconButton,
  Input,
  SimpleGrid,
  Box,
  Flex,
  Text,
} from '@chakra-ui/react';
import { ICON_NAMES } from './iconMap';
import PromptIcon from './PromptIcon.component';

interface IconPickerProps {
  value: string | null;
  onChange: (name: string | null) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  return (
    <Popover placement="bottom-start" isLazy>
      {({ onClose }) => (
        <>
          <PopoverTrigger>
            <IconButton
              aria-label="Pick icon"
              size="md"
              borderRadius="7px"
              border="0.5px solid var(--dark-quaternary, rgba(255, 255, 255, 0.10))"
              background="rgba(255, 255, 255, 0.05)"
              _hover={{ background: 'rgba(255, 255, 255, 0.10)' }}
              icon={<PromptIcon name={value} size={18} />}
            />
          </PopoverTrigger>
          <PopoverContent
            bg="#1B1A1D"
            borderColor="rgba(255, 255, 255, 0.10)"
            width="320px"
          >
            <PopoverArrow bg="#1B1A1D" />
            <PopoverBody>
              <Flex direction="column" gap={2}>
                <Input
                  placeholder="Search icons…"
                  size="sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  color="white"
                  borderColor="rgba(255, 255, 255, 0.15)"
                  _placeholder={{ color: 'rgba(255,255,255,0.4)' }}
                />
                <Flex justify="space-between" align="center">
                  <Text fontSize="xs" color="rgba(255,255,255,0.5)">
                    {filtered.length}
                    {' '}
                    icons
                  </Text>
                  {value && (
                    <Text
                      as="button"
                      fontSize="xs"
                      color="rgba(255,255,255,0.7)"
                      _hover={{ color: 'white' }}
                      onClick={() => {
                        onChange(null);
                        onClose();
                      }}
                    >
                      Clear
                    </Text>
                  )}
                </Flex>
                <Box maxHeight="260px" overflowY="auto">
                  <SimpleGrid columns={7} spacing={1}>
                    {filtered.map((name) => {
                      const selected = value === name;
                      return (
                        <Box
                          key={name}
                          as="button"
                          type="button"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          width="36px"
                          height="36px"
                          borderRadius="6px"
                          bg={selected ? 'rgba(255,255,255,0.15)' : 'transparent'}
                          _hover={{ bg: 'rgba(255,255,255,0.10)' }}
                          onClick={() => {
                            onChange(name);
                            onClose();
                          }}
                          title={name}
                        >
                          <PromptIcon name={name} size={18} />
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              </Flex>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  );
};

export default IconPicker;
