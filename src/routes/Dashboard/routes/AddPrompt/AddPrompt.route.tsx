import { useState, useContext, useEffect } from 'react';
import {
  Box, FormControl, FormLabel, Text, VStack, useToast, Select,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CustomInput from '../../../../components/CustomInput/CustomInput.component';
import { storePrompt, getCategories } from '../../../../utils/database';
import CustomButton from '../../../../components/CustomButton/CustomButton.component';
import { UpdateContext } from '../../../../contexts/update.context';
import { ICategory } from '../../../../types/Prompt.types';
import { routes } from '../routes';

const NEW_CATEGORY_SENTINEL = '__new_category__';

function AddPrompt() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
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

    await storePrompt(title, text, selectedCategory || null);
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
    setUpdate();
  };

  return (
    <Box borderRadius="md" overflowY="auto" maxHeight="calc(100vh - 127px)">
      <VStack spacing={4} align="start">
        <FormControl>
          <Text fontWeight="bold">{t('prompts.newPromptTitle')}</Text>
        </FormControl>

        <FormControl>
          <FormLabel>{t('prompts.titleLabel')}</FormLabel>
          <CustomInput
            placeholder={t('prompts.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </FormControl>

        <FormControl>
          <FormLabel>{t('prompts.textLabel')}</FormLabel>
          <CustomInput
            placeholder={t('prompts.textPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
          />
        </FormControl>

        <FormControl>
          <FormLabel>{t('prompts.categoryLabel')}</FormLabel>
          <Select
            placeholder={t('prompts.selectCategory')}
            color="#667085"
            value={selectedCategory}
            onChange={(e) => {
              if (e.target.value === NEW_CATEGORY_SENTINEL) {
                nav(routes.addCategory);
                return;
              }
              setSelectedCategory(e.target.value);
            }}
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
        </FormControl>

        <CustomButton icon={<AddIcon />} onClick={handleAddPrompt}>
          {t('prompts.addButton')}
        </CustomButton>
      </VStack>
    </Box>
  );
}

export default AddPrompt;
