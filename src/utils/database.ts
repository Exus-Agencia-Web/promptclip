import Database from 'tauri-plugin-sql-api';
import { v4 as uuidv4 } from 'uuid';
import { ICategory, IPrompt } from '../types/Prompt.types';

let dbPromise: Promise<Database> | null = null;

const getDb = (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:prompts.db');
  }
  return dbPromise;
};

export const createPromptsTable = async () => {
  const db = await getDb();
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS prompts (
      uuid TEXT PRIMARY KEY,
      promptName TEXT,
      prompt TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_used_at INTEGER DEFAULT NULL,
      used INTEGER DEFAULT 0,
      isFavorite INTEGER DEFAULT 0,
      category_id TEXT,
      icon TEXT,
      FOREIGN KEY (category_id) REFERENCES categories (uuid)
    );

    CREATE TABLE IF NOT EXISTS categories (
      uuid TEXT PRIMARY KEY,
      name TEXT,
      promptsCount INTEGER DEFAULT 0
    )
  `;
  await db.execute(createTableQuery);

  try {
    await db.execute('ALTER TABLE prompts ADD COLUMN icon TEXT');
  } catch {
    // column already exists — ignore
  }
};

const updateCategoryPromptsCount = async (categoryId: string) => {
  const db = await getDb();
  await db.execute(
    `UPDATE categories
     SET promptsCount = (
       SELECT COUNT(*) FROM prompts WHERE category_id = $1
     )
     WHERE uuid = $2`,
    [categoryId, categoryId],
  );
};

export const updateAllCategoryPromptsCounts = async () => {
  const db = await getDb();
  const categories: { uuid: string }[] = await db.select(
    'SELECT uuid FROM categories',
  );
  await Promise.all(
    categories.map((category) => updateCategoryPromptsCount(category.uuid)),
  );
};

const updateAffectedCategoryPromptsCounts = async (
  ...categoryIds: (string | null | undefined)[]
) => {
  const unique = Array.from(
    new Set(categoryIds.filter((id): id is string => Boolean(id))),
  );
  await Promise.all(unique.map((id) => updateCategoryPromptsCount(id)));
};

export const storePrompt = async (
  promptName: string,
  prompt: string,
  categoryId: string | null,
  icon: string | null,
) => {
  const db = await getDb();
  const uuid = uuidv4();
  await db.execute(
    `INSERT INTO prompts (uuid, promptName, prompt, category_id, icon)
     VALUES ($1, $2, $3, $4, $5)`,
    [uuid, promptName, prompt, categoryId, icon],
  );

  if (categoryId) {
    await updateCategoryPromptsCount(categoryId);
  }
};

export const updatePrompt = async (prompt: IPrompt) => {
  const db = await getDb();
  const previous: { category_id: string | null }[] = await db.select(
    'SELECT category_id FROM prompts WHERE uuid = $1',
    [prompt.uuid],
  );
  const previousCategoryId = previous[0]?.category_id ?? null;

  await db.execute(
    `UPDATE prompts
     SET promptName = $1, prompt = $2, category_id = $3, icon = $4
     WHERE uuid = $5`,
    [prompt.promptName, prompt.prompt, prompt.category_id, prompt.icon, prompt.uuid],
  );

  await updateAffectedCategoryPromptsCounts(
    previousCategoryId,
    prompt.category_id,
  );
};

export const insertCategory = async (name: string) => {
  const db = await getDb();
  const existingCategory: ICategory[] = await db.select(
    'SELECT uuid FROM categories WHERE name = $1',
    [name],
  );

  if (existingCategory.length > 0) {
    throw new Error('Category with the same name already exists.');
  }

  const uuid = uuidv4();
  await db.execute(
    'INSERT INTO categories (uuid, name) VALUES ($1, $2)',
    [uuid, name],
  );
};

export const updateCategory = async (uuid: string, newName: string) => {
  const db = await getDb();
  const existingCategory: ICategory[] = await db.select(
    'SELECT uuid FROM categories WHERE uuid = $1',
    [uuid],
  );

  if (existingCategory.length === 0) {
    throw new Error('Category with the provided UUID does not exist.');
  }

  await db.execute(
    'UPDATE categories SET name = $1 WHERE uuid = $2',
    [newName, uuid],
  );
};

export const deleteCategory = async (uuid: string) => {
  const db = await getDb();
  await db.execute(
    'UPDATE prompts SET category_id = NULL WHERE category_id = $1',
    [uuid],
  );
  await db.execute(
    'DELETE FROM categories WHERE uuid = $1',
    [uuid],
  );
};

export const getCategoryByUUID = async (uuid: string): Promise<ICategory | null> => {
  const db = await getDb();
  const result: ICategory[] = await db.select(
    'SELECT * FROM categories WHERE uuid = $1 LIMIT 1',
    [uuid],
  );
  return result.length > 0 ? result[0] : null;
};

export const getPrompts = async (
  filter: 'lastUsed' | 'used' | 'dateCreated',
  favorites?: boolean,
): Promise<IPrompt[]> => {
  const db = await getDb();
  let selectQuery = `
    SELECT prompts.*, categories.name AS categoryName
    FROM prompts
    LEFT JOIN categories ON prompts.category_id = categories.uuid`;

  const params: unknown[] = [];
  if (favorites !== undefined) {
    selectQuery += ' WHERE isFavorite = $1';
    params.push(favorites ? 1 : 0);
  }

  if (filter === 'lastUsed') {
    selectQuery += ' ORDER BY last_used_at DESC';
  } else if (filter === 'used') {
    selectQuery += ' ORDER BY used DESC';
  } else if (filter === 'dateCreated') {
    selectQuery += ' ORDER BY created_at DESC';
  }

  const result: IPrompt[] = params.length > 0
    ? await db.select(selectQuery, params)
    : await db.select(selectQuery);
  return result;
};

export const getPromptByUUID = async (uuid: string): Promise<IPrompt | null> => {
  const db = await getDb();
  const result: IPrompt[] = await db.select(
    `SELECT prompts.*, categories.name AS categoryName
     FROM prompts
     LEFT JOIN categories ON prompts.category_id = categories.uuid
     WHERE prompts.uuid = $1`,
    [uuid],
  );

  if (result.length > 0) {
    const prompt = result[0];
    return {
      uuid: prompt.uuid,
      promptName: prompt.promptName,
      prompt: prompt.prompt,
      created_at: prompt.created_at,
      last_used_at: prompt.last_used_at,
      used: prompt.used,
      isFavorite: prompt.isFavorite,
      category_id: prompt.category_id,
      icon: prompt.icon ?? null,
    };
  }

  return null;
};

export const getCategories = async (): Promise<ICategory[]> => {
  const db = await getDb();
  const result: ICategory[] = await db.select('SELECT * FROM categories');
  return result;
};

export const searchPrompts = async (searchTerm: string): Promise<IPrompt[]> => {
  const db = await getDb();
  const pattern = `%${searchTerm}%`;
  const result: IPrompt[] = await db.select(
    `SELECT * FROM prompts
     WHERE promptName LIKE $1 OR prompt LIKE $2`,
    [pattern, pattern],
  );
  return result;
};

export const deletePrompt = async (uuid: string) => {
  const db = await getDb();
  const rows: { category_id: string | null }[] = await db.select(
    'SELECT category_id FROM prompts WHERE uuid = $1',
    [uuid],
  );
  const categoryId = rows[0]?.category_id ?? null;

  await db.execute('DELETE FROM prompts WHERE uuid = $1', [uuid]);

  if (categoryId) {
    await updateCategoryPromptsCount(categoryId);
  }
};

export const incrementUsageAndSetLastUsed = async (uuid: string) => {
  const db = await getDb();
  await db.execute(
    `UPDATE prompts
     SET used = used + 1, last_used_at = strftime('%s', 'now')
     WHERE uuid = $1`,
    [uuid],
  );
};

export const toggleFavorite = async (uuid: string, isFavorite: boolean) => {
  const db = await getDb();
  const favorite = isFavorite ? 0 : 1;
  await db.execute(
    'UPDATE prompts SET isFavorite = $1 WHERE uuid = $2',
    [favorite, uuid],
  );
};
