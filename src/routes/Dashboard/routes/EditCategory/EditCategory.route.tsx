import { useState, useContext, useEffect } from 'react';
import {
  Box, FormControl, FormLabel, Text, VStack, useToast, HStack,
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';
import { useNavigate, useParams } from 'react-router-dom';
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
          title: 'Error',
          description: 'Failed to fetch the category.',
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
        title: 'Error',
        description: 'Please enter a category name.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (trimmed.length > 60) {
      toast({
        title: 'Error',
        description: 'Category name must be 60 characters or fewer.',
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
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update the category.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: 'Category updated.',
      description: "We've updated the category for you.",
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    setUpdate();
  };

  const handleDeleteCategory = async () => {
    const confirmed = window.confirm(
      'Delete this category? Prompts inside will be kept but unassigned.',
    );
    if (!confirmed) return;

    try {
      await deleteCategory(uuid);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('deleteCategory failed', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete the category.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    toast({
      title: 'Category deleted.',
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
          <Text fontWeight="bold">Edit Category</Text>
        </FormControl>

        <FormControl>
          <FormLabel>Category name</FormLabel>
          <CustomInput
            placeholder="Enter the category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            autoFocus
          />
        </FormControl>

        <HStack spacing={3}>
          <CustomButton icon={<CheckIcon />} onClick={handleEditCategory}>
            Save Changes
          </CustomButton>
          <CustomButton icon={<TrashIcon />} onClick={handleDeleteCategory}>
            Delete Category
          </CustomButton>
        </HStack>
      </VStack>
    </Box>
  );
}

export default EditCategory;
