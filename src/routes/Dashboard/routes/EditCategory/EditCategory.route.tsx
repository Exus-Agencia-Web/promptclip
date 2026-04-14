import { useState, useContext, useEffect } from 'react';
import {
  Box, FormControl, FormLabel, Text, VStack, useToast, HStack,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CustomInput from '../../../../components/CustomInput/CustomInput.component';
import {
  updateCategory,
  getCategoryByUUID,
  deleteCategory,
} from '../../../../utils/database';
import CustomButton from '../../../../components/CustomButton/CustomButton.component';
import { UpdateContext } from '../../../../contexts/update.context';
import { TrashIcon } from '../../../../components/Icons/TrashIcon';
import { routes } from '../routes';

function EditCategory() {
  const { t } = useTranslation();
  const { uuid } = useParams();
  if (!uuid) {
    return null;
  }
  const [newCategoryName, setNewCategoryName] = useState('');
  const { setUpdate } = useContext(UpdateContext);
  const toast = useToast();
  const nav = useNavigate();

  useEffect(() => {
    const fetchCategoryName = async () => {
      try {
        const category = await getCategoryByUUID(uuid);
        if (category) {
          setNewCategoryName(category.name);
        }
      } catch (err) {
        toast({
          title: t('common.error'),
          description: t('categories.failedFetch'),
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    };

    fetchCategoryName();
  }, [uuid]);

  const handleEditCategory = async () => {
    const trimmed = newCategoryName.trim();

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
      await updateCategory(uuid, trimmed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('updateCategory failed', err);
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('categories.failedUpdate'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: t('categories.updatedTitle'),
      description: t('categories.updatedDesc'),
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    setUpdate();
  };

  const handleDeleteCategory = async () => {
    const confirmed = window.confirm(t('categories.deleteConfirm'));
    if (!confirmed) return;

    try {
      await deleteCategory(uuid);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('deleteCategory failed', err);
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('categories.failedDelete'),
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: t('categories.deletedTitle'),
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    setUpdate();
    nav(routes.allPrompts);
  };

  return (
    <Box borderRadius="md">
      <VStack spacing={4} align="start">
        <FormControl>
          <Text fontWeight="bold">{t('categories.editTitle')}</Text>
        </FormControl>

        <FormControl>
          <FormLabel>{t('categories.nameLabel')}</FormLabel>
          <CustomInput
            placeholder={t('categories.namePlaceholder')}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            autoFocus
          />
        </FormControl>

        <HStack spacing={3}>
          <CustomButton icon={<CheckIcon />} onClick={handleEditCategory}>
            {t('categories.saveButton')}
          </CustomButton>
          <CustomButton icon={<TrashIcon />} onClick={handleDeleteCategory}>
            {t('categories.deleteButton')}
          </CustomButton>
        </HStack>
      </VStack>
    </Box>
  );
}

export default EditCategory;
