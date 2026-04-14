import { Text } from '@chakra-ui/react';
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DetailedPrompt from '../../../../components/DetailedPrompt/DetailedPrompt.component';
import CustomInput from '../../../../components/CustomInput/CustomInput.component';
import { IPrompt, ICategory } from '../../../../types/Prompt.types';
import { filterPrompts } from '../../../../utils/utils';
import { UpdateContext } from '../../../../contexts/update.context';
import { CategoriesContext } from '../../../../contexts/categories.context';
import { routes } from '../routes';

type StaticFilter =
  | 'DateCreated'
  | 'Favorites'
  | 'MostUsed'
  | 'RecentlyUsed'
  | 'AllPrompts';

interface DisplayPromptsProps {
  prompts: IPrompt[];
  setPrompts: (prompts: IPrompt[]) => void;
  filterOption?: StaticFilter | ICategory | null;
}

const DisplayPrompts = ({ prompts, filterOption }: DisplayPromptsProps) => {
  const [sortedPrompts, setSortedPrompts] = useState(prompts);
  const { setUpdate } = useContext(UpdateContext);
  const { categories } = useContext(CategoriesContext);
  const { uuid: categoryUuidFromUrl } = useParams();
  const nav = useNavigate();

  const categoryFromUrl: ICategory | undefined = categoryUuidFromUrl
    ? categories.find((category) => category.uuid === categoryUuidFromUrl)
    : undefined;

  const activeFilter: StaticFilter | ICategory | null | undefined =
    filterOption ?? categoryFromUrl;

  useEffect(() => {
    if (activeFilter) {
      let filteredPrompts = prompts;

      if (activeFilter === 'Favorites') {
        filteredPrompts = prompts.filter((prompt) => prompt.isFavorite);
      } else if (activeFilter === 'DateCreated') {
        filteredPrompts = [...prompts].sort(
          (a, b) => (b.created_at || 0) - (a.created_at || 0),
        );
      } else if (activeFilter === 'MostUsed') {
        filteredPrompts = [...prompts].sort((a, b) => b.used - a.used);
      } else if (activeFilter === 'RecentlyUsed') {
        filteredPrompts = [...prompts].sort(
          (a, b) => (b.last_used_at || 0) - (a.last_used_at || 0),
        );
      } else if (activeFilter === 'AllPrompts') {
        filteredPrompts = prompts;
      } else if (typeof activeFilter === 'object') {
        filteredPrompts = prompts.filter(
          (prompt) => prompt.category_id === activeFilter.uuid,
        );
      }

      setSortedPrompts([...filteredPrompts]);
    } else {
      setSortedPrompts([...prompts]);
    }
  }, [activeFilter, prompts]);

  if (categoryUuidFromUrl && categories.length > 0 && !categoryFromUrl) {
    return (
      <div>
        <Text fontWeight="bold">Category not found</Text>
        <Text color="grey" marginTop="8px">
          This category may have been deleted.
        </Text>
      </div>
    );
  }

  const getFilterOptionLabel = (): string => {
    if (activeFilter === 'DateCreated') {
      return 'All Prompts';
    }
    if (typeof activeFilter === 'string') {
      return activeFilter;
    }
    if (activeFilter && typeof activeFilter === 'object' && activeFilter.name) {
      return activeFilter.name;
    }
    return 'All Prompts';
  };

  const editableCategory: ICategory | null =
    activeFilter && typeof activeFilter === 'object' ? activeFilter : null;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Text fontWeight="bold">{getFilterOptionLabel()}</Text>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Text
            color="grey"
            cursor="pointer"
            onClick={() => {
              setUpdate();
            }}
          >
            Refresh
          </Text>
          {editableCategory && (
            <Text
              color="grey"
              cursor="pointer"
              onClick={() => {
                nav(`${routes.editCategory}/${editableCategory.uuid}`);
              }}
            >
              Edit Category
            </Text>
          )}
        </div>
      </div>
      <CustomInput
        placeholder="Search"
        marginTop="16px"
        onChange={(e) => {
          const searchResults = filterPrompts(prompts, e.target.value);
          setSortedPrompts(searchResults);
        }}
      />
      <div className="detailedPromptsContainer">
        {sortedPrompts.map((prompt, index) => (
          <DetailedPrompt key={index} {...prompt} />
        ))}
      </div>
    </div>
  );
};

export default DisplayPrompts;
