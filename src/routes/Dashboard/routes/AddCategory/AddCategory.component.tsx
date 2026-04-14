import { useState, useContext } from 'react';
import {
  Box, FormControl, FormLabel, Text, VStack, useToast,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import CustomInput from '../../../../components/CustomInput/CustomInput.component';
import { insertCategory } from '../../../../utils/database';
import CustomButton from '../../../../components/CustomButton/CustomButton.component';
import { UpdateContext } from '../../../../contexts/update.context';

function AddCategory() {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState('');
  const { setUpdate } = useContext(UpdateContext);
  const toast = useToast();

  const handleAddCategory = async () => {
    const trimmed = categoryName.trim();

    if (trimmed.length === 0) {
      toast({
        title: t('common.error'),
        description: t('categories.enterName'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (trimmed.length > 60) {
      toast({
        title: t('common.error'),
        description: t('categories.tooLong'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      await insertCategory(trimmed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('insertCategory failed', err);
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('categories.failedCreate'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    toast({
      title: t('categories.addedTitle'),
      description: t('categories.addedDesc'),
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    setCategoryName('');
    setUpdate();
  };

  return (
    <Box borderRadius="md">
      <VStack spacing={4} align="start">
        <FormControl>
          <Text fontWeight="bold">{t('categories.addTitle')}</Text>
        </FormControl>

        <FormControl>
          <FormLabel>{t('categories.nameLabel')}</FormLabel>
          <CustomInput
            placeholder={t('categories.namePlaceholder')}
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            autoFocus
          />
        </FormControl>

        <CustomButton icon={<AddIcon />} onClick={handleAddCategory}>
          {t('categories.addButton')}
        </CustomButton>
      </VStack>
    </Box>
  );
}

export default AddCategory;
