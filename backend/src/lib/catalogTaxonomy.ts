import { sql } from '../db/index.js';
import { getContent, setContent } from './content.js';
import { getErpVisibility, setErpVisibility } from './erpVisibility.js';
import { slugifyName } from './catalogStore.js';

const EXTRA_KEY = 'catalog_extra_groups';
const EXTRA_TAXONOMY_KEY = 'catalog_extra_taxonomy';

export type ExtraGroup = { name: string; slug: string };
export type ExtraTaxonomy = {
  types: ExtraGroup[];
  articles: ExtraGroup[];
  metals: string[];
  purities: string[];
};
export type TaxonomyKind = 'group' | 'type' | 'article' | 'metal' | 'purity';

function uniqueNamed(items: ExtraGroup[]) {
  const seen = new Set<string>();
  const unique: ExtraGroup[] = [];
  for (const g of items) {
    const name = String(g?.name || '').trim();
    const slug = String(g?.slug || slugifyName(name)).trim();
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);
    unique.push({ name, slug });
  }
  return unique;
}

function uniqueStrings(items: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of items) {
    const name = String(raw || '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

function upsertNamed(list: ExtraGroup[], fromSlug: string, name: string, toSlug: string) {
  const next = list.filter((g) => g.slug !== fromSlug && g.slug !== toSlug);
  next.push({ name, slug: toSlug });
  return uniqueNamed(next);
}

export async function getExtraGroups(): Promise<ExtraGroup[]> {
  const data = await getContent<{ groups?: ExtraGroup[] }>(EXTRA_KEY, { groups: [] });
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  return uniqueNamed(groups);
}

async function saveExtraGroups(groups: ExtraGroup[]) {
  await setContent(EXTRA_KEY, { groups: uniqueNamed(groups) });
}

export async function getExtraTaxonomy(): Promise<ExtraTaxonomy> {
  const data = await getContent<Partial<ExtraTaxonomy>>(EXTRA_TAXONOMY_KEY, {
    types: [],
    articles: [],
    metals: [],
    purities: [],
  });
  return {
    types: uniqueNamed(Array.isArray(data?.types) ? data.types : []),
    articles: uniqueNamed(Array.isArray(data?.articles) ? data.articles : []),
    metals: uniqueStrings(Array.isArray(data?.metals) ? data.metals : []),
    purities: uniqueStrings(Array.isArray(data?.purities) ? data.purities : []),
  };
}

async function saveExtraTaxonomy(next: ExtraTaxonomy) {
  await setContent(EXTRA_TAXONOMY_KEY, {
    types: uniqueNamed(next.types),
    articles: uniqueNamed(next.articles),
    metals: uniqueStrings(next.metals),
    purities: uniqueStrings(next.purities),
  });
}

async function retargetRelatedSlugs(fromSlug: string, toSlug: string, name: string) {
  const visibility = await getErpVisibility();
  const visibleCategories = visibility.visibleCategories.map((s) => (s === fromSlug ? toSlug : s));
  if (visibleCategories.join() !== visibility.visibleCategories.join()) {
    await setErpVisibility({ visibleCategories });
  }

  const header = await getContent<{ selectedGroups?: Array<{ slug: string; label: string; dropdown: unknown }> }>(
    'header',
    { selectedGroups: [] },
  );
  const selectedGroups = Array.isArray(header.selectedGroups) ? header.selectedGroups : [];
  const nextHeader = selectedGroups.map((g) =>
    g.slug === fromSlug ? { ...g, slug: toSlug, label: name.toUpperCase() } : g,
  );
  await setContent('header', { ...header, selectedGroups: nextHeader });

  const images = await getContent<{ images?: Record<string, string> }>('groupImages', { images: {} });
  const map = images?.images && typeof images.images === 'object' ? { ...images.images } : {};
  if (fromSlug !== toSlug && map[fromSlug] && !map[toSlug]) {
    map[toSlug] = map[fromSlug];
    delete map[fromSlug];
    await setContent('groupImages', { images: map });
  }
}

export async function createCatalogGroup(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error('Category name is required'), { status: 400 });
  }
  const slug = slugifyName(trimmed);
  if (!slug) {
    throw Object.assign(new Error('Category name is invalid'), { status: 400 });
  }
  const extra = await getExtraGroups();
  await saveExtraGroups(upsertNamed(extra, slug, trimmed, slug));
  const visibility = await getErpVisibility();
  if (!visibility.visibleCategories.includes(slug)) {
    await setErpVisibility({
      visibleCategories: [...visibility.visibleCategories, slug],
    });
  }
  return { name: trimmed, slug };
}

export async function createCatalogTaxonomyValue(kind: Exclude<TaxonomyKind, 'group'>, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error('Name is required'), { status: 400 });
  }
  const extra = await getExtraTaxonomy();
  if (kind === 'type' || kind === 'article') {
    const slug = slugifyName(trimmed);
    if (!slug) throw Object.assign(new Error('Name is invalid'), { status: 400 });
    const key = kind === 'type' ? 'types' : 'articles';
    extra[key] = upsertNamed(extra[key], slug, trimmed, slug);
  } else if (kind === 'metal') {
    extra.metals = uniqueStrings([...extra.metals, trimmed]);
  } else {
    extra.purities = uniqueStrings([...extra.purities, trimmed]);
  }
  await saveExtraTaxonomy(extra);
  return { kind, name: trimmed, slug: slugifyName(trimmed) };
}

export async function renameTaxonomy(kind: TaxonomyKind, fromSlug: string, name: string) {
  const trimmed = name.trim();
  const from = String(fromSlug || '').trim();
  const toSlug = slugifyName(trimmed);
  if (!from || !trimmed || (kind !== 'metal' && kind !== 'purity' && !toSlug)) {
    throw Object.assign(new Error('Name and current slug are required'), { status: 400 });
  }

  if (kind === 'group') {
    await sql`
      UPDATE cached_catalog_items
      SET
        group_slug = ${toSlug},
        origin = 'website',
        synced_at = NOW(),
        data = jsonb_set(
          jsonb_set(COALESCE(data, '{}'::jsonb), '{group}', to_jsonb(${trimmed}::text)),
          '{group_slug}', to_jsonb(${toSlug}::text)
        )
      WHERE group_slug = ${from} OR group_slug = ${toSlug}
    `;
    await retargetRelatedSlugs(from, toSlug, trimmed);
    const extra = await getExtraGroups();
    await saveExtraGroups(upsertNamed(extra, from, trimmed, toSlug));
  } else if (kind === 'type') {
    await sql`
      UPDATE cached_catalog_items
      SET
        type_slug = ${toSlug},
        origin = 'website',
        synced_at = NOW(),
        data = jsonb_set(
          jsonb_set(COALESCE(data, '{}'::jsonb), '{type}', to_jsonb(${trimmed}::text)),
          '{type_slug}', to_jsonb(${toSlug}::text)
        )
      WHERE type_slug = ${from} OR type_slug = ${toSlug}
    `;
    const extra = await getExtraTaxonomy();
    extra.types = upsertNamed(extra.types, from, trimmed, toSlug);
    await saveExtraTaxonomy(extra);
  } else if (kind === 'article') {
    await sql`
      UPDATE cached_catalog_items
      SET
        article_slug = ${toSlug},
        origin = 'website',
        synced_at = NOW(),
        data = jsonb_set(
          jsonb_set(COALESCE(data, '{}'::jsonb), '{article}', to_jsonb(${trimmed}::text)),
          '{article_slug}', to_jsonb(${toSlug}::text)
        )
      WHERE article_slug = ${from} OR article_slug = ${toSlug}
    `;
    const extra = await getExtraTaxonomy();
    extra.articles = upsertNamed(extra.articles, from, trimmed, toSlug);
    await saveExtraTaxonomy(extra);
  } else if (kind === 'metal') {
    await sql`
      UPDATE cached_catalog_items
      SET metal_type = ${trimmed}, origin = 'website', synced_at = NOW(),
          data = jsonb_set(COALESCE(data, '{}'::jsonb), '{metal_type}', to_jsonb(${trimmed}::text))
      WHERE metal_type = ${from}
    `;
    const extra = await getExtraTaxonomy();
    extra.metals = uniqueStrings(
      extra.metals.map((m) => (m.toLowerCase() === from.toLowerCase() ? trimmed : m)).concat(trimmed),
    );
    await saveExtraTaxonomy(extra);
  } else {
    await sql`
      UPDATE cached_catalog_items
      SET purity = ${trimmed}, origin = 'website', synced_at = NOW(),
          data = jsonb_set(COALESCE(data, '{}'::jsonb), '{purity}', to_jsonb(${trimmed}::text))
      WHERE purity = ${from}
    `;
    const extra = await getExtraTaxonomy();
    extra.purities = uniqueStrings(
      extra.purities.map((m) => (m.toLowerCase() === from.toLowerCase() ? trimmed : m)).concat(trimmed),
    );
    await saveExtraTaxonomy(extra);
  }

  return { kind, from_slug: from, name: trimmed, slug: toSlug || trimmed };
}

export async function deleteCatalogGroup(fromSlug: string) {
  const from = String(fromSlug || '').trim();
  if (!from) {
    throw Object.assign(new Error('Category is required'), { status: 400 });
  }

  const deletedRows = await sql`
    DELETE FROM cached_catalog_items
    WHERE group_slug = ${from}
    RETURNING tag_number
  `;
  const rows = Array.isArray(deletedRows) ? deletedRows : [];
  const deletedTags = new Set(
    rows.map((row: { tag_number?: string }) => String(row.tag_number || '').toUpperCase()).filter(Boolean),
  );
  const deletedItems = deletedTags.size;

  const extra = await getExtraGroups();
  await saveExtraGroups(extra.filter((g) => g.slug !== from));

  const visibility = await getErpVisibility();
  await setErpVisibility({
    visibleCategories: visibility.visibleCategories.filter((s) => s !== from),
    visibleProducts: visibility.visibleProducts.filter((tag) => !deletedTags.has(String(tag).toUpperCase())),
  });

  const header = await getContent<{ selectedGroups?: Array<{ slug: string; label: string; dropdown: unknown }> }>(
    'header',
    { selectedGroups: [] },
  );
  const selectedGroups = Array.isArray(header.selectedGroups) ? header.selectedGroups : [];
  await setContent('header', {
    ...header,
    selectedGroups: selectedGroups.filter((g) => g.slug !== from),
  });

  const images = await getContent<{ images?: Record<string, string> }>('groupImages', { images: {} });
  const map = images?.images && typeof images.images === 'object' ? { ...images.images } : {};
  if (map[from]) {
    delete map[from];
    await setContent('groupImages', { images: map });
  }

  return { slug: from, deleted: true, deleted_items: deletedItems };
}

export async function deleteTaxonomyValue(kind: Exclude<TaxonomyKind, 'group'>, fromSlug: string) {
  const from = String(fromSlug || '').trim();
  if (!from) {
    throw Object.assign(new Error('Current value is required'), { status: 400 });
  }
  const extra = await getExtraTaxonomy();
  if (kind === 'type') {
    await sql`
      UPDATE cached_catalog_items
      SET
        type_slug = NULL,
        origin = 'website',
        synced_at = NOW(),
        data = (COALESCE(data, '{}'::jsonb) - 'type') - 'type_slug'
      WHERE type_slug = ${from}
    `;
    extra.types = extra.types.filter((g) => g.slug !== from);
  } else if (kind === 'article') {
    await sql`
      UPDATE cached_catalog_items
      SET
        article_slug = NULL,
        origin = 'website',
        synced_at = NOW(),
        data = (COALESCE(data, '{}'::jsonb) - 'article') - 'article_slug'
      WHERE article_slug = ${from}
    `;
    extra.articles = extra.articles.filter((g) => g.slug !== from);
  } else if (kind === 'metal') {
    await sql`
      UPDATE cached_catalog_items
      SET metal_type = NULL, origin = 'website', synced_at = NOW(),
          data = COALESCE(data, '{}'::jsonb) - 'metal_type'
      WHERE metal_type = ${from}
    `;
    extra.metals = extra.metals.filter((m) => m.toLowerCase() !== from.toLowerCase());
  } else {
    await sql`
      UPDATE cached_catalog_items
      SET purity = NULL, origin = 'website', synced_at = NOW(),
          data = COALESCE(data, '{}'::jsonb) - 'purity'
      WHERE purity = ${from}
    `;
    extra.purities = extra.purities.filter((m) => m.toLowerCase() !== from.toLowerCase());
  }
  await saveExtraTaxonomy(extra);
  return { kind, from_slug: from, deleted: true };
}

export async function moveItemsToGroup(tags: string[], groupName: string) {
  const unique = [...new Set(tags.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  const trimmed = groupName.trim();
  const toSlug = slugifyName(trimmed);
  if (!unique.length || !trimmed || !toSlug) {
    throw Object.assign(new Error('tags and group are required'), { status: 400 });
  }
  await sql`
    UPDATE cached_catalog_items
    SET
      group_slug = ${toSlug},
      origin = 'website',
      synced_at = NOW(),
      data = jsonb_set(
        jsonb_set(COALESCE(data, '{}'::jsonb), '{group}', to_jsonb(${trimmed}::text)),
        '{group_slug}', to_jsonb(${toSlug}::text)
      )
    WHERE tag_number = ANY(${unique}::text[])
  `;
  const extra = await getExtraGroups();
  await saveExtraGroups(upsertNamed(extra, toSlug, trimmed, toSlug));
  return { count: unique.length, group: trimmed, slug: toSlug };
}
