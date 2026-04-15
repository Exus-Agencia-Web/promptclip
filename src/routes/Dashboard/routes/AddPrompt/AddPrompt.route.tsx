import { useState, useContext, useEffect } from 'react';
import {
  Box, FormControl, FormLabel, Text, useToast, Select, HStack, Flex,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CustomInput from '../../../../components/CustomInput/CustomInput.component';
import { storePrompt, getCategories } from '../../../../utils/database';
import CustomButton from '../../../../components/CustomButton/CustomButton.component';
import IconPicker from '../../../../components/IconPicker/IconPicker.component';
import { UpdateContext } from '../../../../contexts/update.context';
import { ICategory } from '../../../../types/Prompt.types';
import { routes } from '../routes';

const NEW_CATEGORY_SENTINEL = '__new_category__';

function AddPrompt() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const { setUpdate } = useContext(UpdateContext);
  const toast = useToast();
  const nav = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      setCategories(await getCategories());
    };

    fetchCategories();
  }, []);

  const handleAddPrompt = async () => {
    if (!title.trim() || !text.trim()) {
      toast({
        title: t('common.error'),
        description: t('prompts.validationRequired'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    await storePrompt(title, text, selectedCategory || null, icon);
    toast({
      title: t('prompts.addedTitle'),
      description: t('prompts.addedDesc'),
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    setTitle('');
    setText('');
    setSelectedCategory('');
    setIcon(null);
    setUpdate();
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === NEW_CATEGORY_SENTINEL) {
      nav(routes.addCategory);
      return;
    }
    setSelectedCategory(e.target.value);
  };

  return (
    <Flex
      borderRadius="md"
      direction="column"
      height="calc(100vh - 127px)"
      gap={4}
    >
      <Text fontWeight="bold" flexShrink={0}>{t('prompts.newPromptTitle')}</Text>

      <FormControl flexShrink={0}>
        <FormLabel>{t('prompts.titleLabel')}</FormLabel>
        <HStack align="center" spacing={2}>
          <IconPicker value={icon} onChange={setIcon} />
          <Box flex="1">
            <CustomInput
              placeholder={t('prompts.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </Box>
          <Box flexBasis="220px" flexShrink={0}>
            <Select
              placeholder={t('prompts.selectCategory')}
              color="#667085"
              value={selectedCategory}
              onChange={handleCategoryChange}
              style={{
                borderRadius: '7px',
                border: '0.5px solid var(--dark-quaternary, rgba(255, 255, 255, 0.10))',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              {categories.map((category) => (
                <option key={category.uuid} value={category.uuid}>
                  {category.name}
                </option>
              ))}
              <option value={NEW_CATEGORY_SENTINEL}>{t('prompts.createNewCategory')}</option>
            </Select>
          </Box>
        </HStack>
      </FormControl>

      <FormControl
        flex="1"
        display="flex"
        flexDirection="column"
        minHeight={0}
      >
        <FormLabel flexShrink={0}>{t('prompts.textLabel')}</FormLabel>
        <Box flex="1" minHeight={0}>
          <CustomInput
            placeholder={t('prompts.textPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            fillHeight
          />
        </Box>
      </FormControl>

      <Box flexShrink={0}>
        <CustomButton icon={<AddIcon />} onClick={handleAddPrompt}>
          {t('prompts.addButton')}
        </CustomButton>
      </Box>
    </Flex>
  );
}

export default AddPrompt;
