#!/usr/bin/env python3
"""
Extract structured data from OpenCart SQL dump for Payload CMS migration.

Parses the MySQL dump and produces:
  - data/opencart/brands.json       — 45 brands
  - data/opencart/categories.json   — 71 categories with hierarchy
  - data/opencart/products.json     — non-JUKI products (manufacturer_id != 6)
  - data/opencart/product_images.json — additional images
  - data/opencart/attribute_names.json — attribute_id → name mapping

Usage:
    python3 scripts/extract-opencart-data.py
"""

import json
import os
import re
import sys
from pathlib import Path

SQL_DUMP = '/tmp/sewtechk_shop_2026-02-20_10-58-47.sql'
OUTPUT_DIR = Path(__file__).parent.parent / 'data' / 'opencart'

JUKI_MANUFACTURER_ID = 6


def parse_insert_values(content: str, table_name: str) -> list[tuple]:
    """Parse INSERT INTO `table_name` VALUES (...),(...); from SQL dump.

    Handles:
    - Escaped quotes (\')
    - Multi-value INSERT statements
    - NULL values
    - Numeric values
    """
    # Find all INSERT statements for this table
    pattern = rf"INSERT INTO `{table_name}` VALUES\s*"
    results = []

    for match in re.finditer(pattern, content):
        pos = match.end()
        rows = _parse_values_block(content, pos)
        results.extend(rows)

    return results


def _parse_values_block(content: str, start: int) -> list[tuple]:
    """Parse the VALUES (...),(...) block starting from `start` position."""
    rows = []
    pos = start
    length = len(content)

    while pos < length:
        # Skip whitespace
        while pos < length and content[pos] in ' \t\r\n':
            pos += 1

        if pos >= length:
            break

        if content[pos] == '(':
            row, pos = _parse_single_row(content, pos)
            rows.append(tuple(row))
        elif content[pos] == ',':
            pos += 1
        elif content[pos] == ';':
            break
        else:
            break

    return rows


def _parse_single_row(content: str, start: int) -> tuple[list, int]:
    """Parse a single (val1, val2, ...) tuple. Returns (values, next_pos)."""
    values = []
    pos = start + 1  # skip opening '('

    while pos < len(content):
        # Skip whitespace
        while pos < len(content) and content[pos] in ' \t\r\n':
            pos += 1

        if content[pos] == ')':
            return values, pos + 1

        if content[pos] == ',':
            pos += 1
            continue

        if content[pos] == "'":
            # String value
            val, pos = _parse_string(content, pos)
            values.append(val)
        elif content[pos:pos + 4] == 'NULL':
            values.append(None)
            pos += 4
        else:
            # Numeric or other value
            end = pos
            while end < len(content) and content[end] not in ',)':
                end += 1
            val_str = content[pos:end].strip()
            try:
                if '.' in val_str:
                    values.append(float(val_str))
                else:
                    values.append(int(val_str))
            except ValueError:
                values.append(val_str)
            pos = end

    return values, pos


def _parse_string(content: str, start: int) -> tuple[str, int]:
    """Parse a MySQL-escaped string starting at the opening quote."""
    pos = start + 1
    chars = []
    length = len(content)

    while pos < length:
        ch = content[pos]
        if ch == '\\' and pos + 1 < length:
            next_ch = content[pos + 1]
            if next_ch == "'":
                chars.append("'")
            elif next_ch == '"':
                chars.append('"')
            elif next_ch == '\\':
                chars.append('\\')
            elif next_ch == 'n':
                chars.append('\n')
            elif next_ch == 'r':
                chars.append('\r')
            elif next_ch == 't':
                chars.append('\t')
            elif next_ch == '0':
                chars.append('\0')
            else:
                chars.append(next_ch)
            pos += 2
        elif ch == "'":
            return ''.join(chars), pos + 1
        else:
            chars.append(ch)
            pos += 1

    return ''.join(chars), pos


def decode_html_entities(text: str) -> str:
    """Decode common HTML entities in OpenCart data."""
    if not text:
        return text
    replacements = {
        '&lt;': '<', '&gt;': '>', '&amp;': '&',
        '&quot;': '"', '&#039;': "'", '&nbsp;': ' ',
    }
    for entity, char in replacements.items():
        text = text.replace(entity, char)
    return text


def extract_brands(content: str) -> list[dict]:
    """Extract brands from oc_manufacturer table."""
    rows = parse_insert_values(content, 'oc_manufacturer')
    brands = []
    for row in rows:
        # (manufacturer_id, name, image, sort_order)
        brands.append({
            'id': row[0],
            'name': str(row[1]),
            'logo_path': str(row[2]) if row[2] else None,
            'sort_order': row[3],
        })
    brands.sort(key=lambda b: b['sort_order'])
    return brands


def extract_categories(content: str) -> list[dict]:
    """Extract categories from oc_category + oc_category_description."""
    cat_rows = parse_insert_values(content, 'oc_category')
    desc_rows = parse_insert_values(content, 'oc_category_description')

    # Build category base info
    cats = {}
    for row in cat_rows:
        # (category_id, image, parent_id, top, column, sort_order, status, date_added, date_modified)
        cat_id = row[0]
        cats[cat_id] = {
            'id': cat_id,
            'parent_id': row[2] if row[2] != 0 else None,
            'sort_order': row[5],
            'status': row[6],
            'image': str(row[1]) if row[1] else None,
        }

    # Add descriptions (prefer RU=3, fallback EN=1)
    desc_by_cat = {}
    for row in desc_rows:
        # (category_id, language_id, name, description, meta_title, meta_description, meta_keyword, meta_h1)
        cat_id = row[0]
        lang_id = row[1]
        if cat_id not in desc_by_cat:
            desc_by_cat[cat_id] = {}
        desc_by_cat[cat_id][lang_id] = {
            'name': str(row[2]),
            'description': decode_html_entities(str(row[3])) if row[3] else '',
            'meta_title': str(row[4]) if row[4] else '',
            'meta_description': str(row[5]) if row[5] else '',
            'meta_keyword': str(row[6]) if row[6] else '',
        }

    # Merge
    result = []
    for cat_id, cat in cats.items():
        descs = desc_by_cat.get(cat_id, {})
        # Prefer Russian (3), then English (1)
        desc = descs.get(3, descs.get(1, {}))
        cat['name'] = desc.get('name', f'Category {cat_id}')
        cat['description'] = desc.get('description', '')
        cat['meta_title'] = desc.get('meta_title', '')
        cat['meta_description'] = desc.get('meta_description', '')
        result.append(cat)

    result.sort(key=lambda c: (c['parent_id'] or 0, c['sort_order']))
    return result


def extract_attribute_names(content: str) -> dict[int, str]:
    """Extract attribute names from oc_attribute_description. Prefer RU (lang=3)."""
    rows = parse_insert_values(content, 'oc_attribute_description')
    names = {}  # attribute_id → name
    for row in rows:
        # (attribute_id, language_id, name)
        attr_id = row[0]
        lang_id = row[1]
        name = str(row[2]).strip()
        # Prefer RU (3) over EN (1)
        if attr_id not in names or lang_id == 3:
            names[attr_id] = name
    return names


def extract_products(content: str, attr_names: dict[int, str]) -> tuple[list[dict], list[dict]]:
    """Extract non-JUKI products with descriptions, attributes, categories, SEO URLs.

    Returns (products, product_images).
    """
    # Parse all needed tables
    prod_rows = parse_insert_values(content, 'oc_product')
    desc_rows = parse_insert_values(content, 'oc_product_description')
    attr_rows = parse_insert_values(content, 'oc_product_attribute')
    img_rows = parse_insert_values(content, 'oc_product_image')
    cat_rows = parse_insert_values(content, 'oc_product_to_category')
    url_rows = parse_insert_values(content, 'oc_url_alias')

    # Build product base info — filter non-JUKI and active only
    products_base = {}
    for row in prod_rows:
        # (product_id, model, sku, upc, ean, jan, isbn, mpn, location,
        #  quantity, stock_status_id, image, manufacturer_id, shipping,
        #  price, points, tax_class_id, date_available, weight, weight_class_id,
        #  length, width, height, length_class_id, subtract, minimum,
        #  sort_order, status, viewed, date_added, date_modified)
        pid = row[0]
        manufacturer_id = row[12]
        status = row[27]

        if manufacturer_id == JUKI_MANUFACTURER_ID:
            continue  # Skip JUKI products
        if status != 1:
            continue  # Skip disabled products

        products_base[pid] = {
            'id': pid,
            'model': str(row[1]),
            'sku': str(row[2]) if row[2] else str(row[1]),
            'manufacturer_id': manufacturer_id,
            'quantity': row[9],
            'stock_status_id': row[10],
            'image': str(row[11]) if row[11] else None,
            'price': float(row[14]) if row[14] else 0.0,
            'weight': float(row[18]) if row[18] else 0.0,
            'sort_order': row[26],
        }

    # Descriptions by product_id, prefer RU (3), fallback EN (1)
    desc_by_pid: dict[int, dict[int, dict]] = {}
    for row in desc_rows:
        # (product_id, language_id, name, description, tag, meta_title, meta_description, meta_keyword, meta_h1)
        pid = row[0]
        lang_id = row[1]
        if pid not in products_base:
            continue
        if pid not in desc_by_pid:
            desc_by_pid[pid] = {}
        desc_by_pid[pid][lang_id] = {
            'name': str(row[2]),
            'description': decode_html_entities(str(row[3])) if row[3] else '',
            'tags': str(row[4]) if row[4] else '',
            'meta_title': str(row[5]) if row[5] else '',
            'meta_description': str(row[6]) if row[6] else '',
            'meta_keyword': str(row[7]) if row[7] else '',
        }

    # Attributes by product_id, prefer RU (3)
    attrs_by_pid: dict[int, list[dict]] = {}
    seen_attrs: dict[int, set] = {}  # pid → set of attr_id (to deduplicate)
    for row in attr_rows:
        # (product_id, attribute_id, language_id, text)
        pid = row[0]
        attr_id = row[1]
        lang_id = row[2]
        text = str(row[3]).strip() if row[3] else ''

        if pid not in products_base or not text:
            continue

        if pid not in attrs_by_pid:
            attrs_by_pid[pid] = []
            seen_attrs[pid] = set()

        attr_name = attr_names.get(attr_id, f'Attribute {attr_id}')

        # Replace only if RU or not yet seen
        if attr_id in seen_attrs[pid]:
            # Update if this is RU version
            if lang_id == 3:
                for existing in attrs_by_pid[pid]:
                    if existing['attribute_id'] == attr_id:
                        existing['name'] = attr_name
                        existing['value'] = text
                        break
        else:
            seen_attrs[pid].add(attr_id)
            attrs_by_pid[pid].append({
                'attribute_id': attr_id,
                'name': attr_name,
                'value': text,
            })

    # Additional images by product_id
    images_by_pid: dict[int, list[dict]] = {}
    all_product_images = []
    for row in img_rows:
        # (product_image_id, product_id, image, sort_order)
        pid = row[1]
        if pid not in products_base:
            continue
        img_data = {
            'product_id': pid,
            'image': str(row[2]) if row[2] else None,
            'sort_order': row[3],
        }
        if img_data['image']:
            if pid not in images_by_pid:
                images_by_pid[pid] = []
            images_by_pid[pid].append(img_data)
            all_product_images.append(img_data)

    # Categories by product_id
    cats_by_pid: dict[int, list[dict]] = {}
    for row in cat_rows:
        # (product_id, category_id, main_category)
        pid = row[0]
        if pid not in products_base:
            continue
        if pid not in cats_by_pid:
            cats_by_pid[pid] = []
        cats_by_pid[pid].append({
            'category_id': row[1],
            'main_category': row[2],
        })

    # URL aliases for products
    url_by_pid: dict[int, str] = {}
    for row in url_rows:
        # (url_alias_id, query, keyword)
        query = str(row[1])
        keyword = str(row[2])
        m = re.match(r'product_id=(\d+)', query)
        if m:
            pid = int(m.group(1))
            if pid in products_base:
                url_by_pid[pid] = keyword

    # Assemble final products
    products = []
    for pid, base in products_base.items():
        descs = desc_by_pid.get(pid, {})
        desc_ru = descs.get(3, {})
        desc_en = descs.get(1, {})

        # Use RU description, fallback to EN
        name = desc_ru.get('name', desc_en.get('name', base['model']))
        description = desc_ru.get('description', desc_en.get('description', ''))
        description_en = desc_en.get('description', '')

        # Categories — find main category
        cat_list = cats_by_pid.get(pid, [])
        main_cat = next((c for c in cat_list if c['main_category'] == 1), None)
        category_ids = [c['category_id'] for c in cat_list]

        product = {
            'id': pid,
            'name': name,
            'model': base['model'],
            'sku': base['sku'] if base['sku'] else base['model'],
            'manufacturer_id': base['manufacturer_id'],
            'price': base['price'],
            'quantity': base['quantity'],
            'stock_status_id': base['stock_status_id'],
            'weight': base['weight'],
            'image': base['image'],
            'additional_images': [img['image'] for img in images_by_pid.get(pid, [])],
            'category_id': main_cat['category_id'] if main_cat else (category_ids[0] if category_ids else None),
            'all_category_ids': category_ids,
            'attributes': attrs_by_pid.get(pid, []),
            'description_ru': description,
            'description_en': description_en,
            'tags': desc_ru.get('tags', desc_en.get('tags', '')),
            'meta_title': desc_ru.get('meta_title', desc_en.get('meta_title', '')),
            'meta_description': desc_ru.get('meta_description', desc_en.get('meta_description', '')),
            'meta_keyword': desc_ru.get('meta_keyword', desc_en.get('meta_keyword', '')),
            'seo_url': url_by_pid.get(pid, ''),
            'sort_order': base['sort_order'],
        }
        products.append(product)

    products.sort(key=lambda p: p['id'])
    all_product_images.sort(key=lambda i: (i['product_id'], i['sort_order']))

    return products, all_product_images


def main():
    print(f'Reading SQL dump: {SQL_DUMP}')
    if not os.path.exists(SQL_DUMP):
        print(f'ERROR: SQL dump not found at {SQL_DUMP}')
        sys.exit(1)

    with open(SQL_DUMP, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    print(f'  Loaded {len(content):,} characters\n')

    # 1. Extract brands
    print('--- Extracting brands ---')
    brands = extract_brands(content)
    print(f'  Found {len(brands)} brands')
    for b in brands[:5]:
        print(f'    {b["id"]}: {b["name"]} (logo: {b["logo_path"]})')
    print(f'    ... and {len(brands) - 5} more\n')

    # 2. Extract categories
    print('--- Extracting categories ---')
    categories = extract_categories(content)
    top_cats = [c for c in categories if c['parent_id'] is None]
    sub_cats = [c for c in categories if c['parent_id'] is not None]
    print(f'  Found {len(categories)} categories ({len(top_cats)} top-level, {len(sub_cats)} subcategories)')
    for c in top_cats[:5]:
        print(f'    {c["id"]}: {c["name"]}')
    print()

    # 3. Extract attribute names
    print('--- Extracting attribute names ---')
    attr_names = extract_attribute_names(content)
    print(f'  Found {len(attr_names)} attribute definitions\n')

    # 4. Extract products
    print('--- Extracting products (non-JUKI, active only) ---')
    products, product_images = extract_products(content, attr_names)
    print(f'  Found {len(products)} non-JUKI products')
    print(f'  Found {len(product_images)} additional images')

    # Stats
    with_desc_ru = sum(1 for p in products if p['description_ru'])
    with_desc_en = sum(1 for p in products if p['description_en'])
    with_price = sum(1 for p in products if p['price'] and p['price'] > 0)
    with_image = sum(1 for p in products if p['image'])
    with_attrs = sum(1 for p in products if p['attributes'])
    with_seo = sum(1 for p in products if p['seo_url'])

    print(f'  With RU description: {with_desc_ru}')
    print(f'  With EN description: {with_desc_en}')
    print(f'  With price > 0: {with_price}')
    print(f'  With main image: {with_image}')
    print(f'  With attributes: {with_attrs}')
    print(f'  With SEO URL: {with_seo}')

    # Manufacturer distribution
    brand_map = {b['id']: b['name'] for b in brands}
    brand_counts: dict[str, int] = {}
    for p in products:
        bname = brand_map.get(p['manufacturer_id'], f'Unknown({p["manufacturer_id"]})')
        brand_counts[bname] = brand_counts.get(bname, 0) + 1
    print('\n  Products by brand:')
    for bname, count in sorted(brand_counts.items(), key=lambda x: -x[1])[:10]:
        print(f'    {bname}: {count}')
    if len(brand_counts) > 10:
        print(f'    ... and {len(brand_counts) - 10} more brands')

    # 5. Save JSON files
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    def save_json(data, filename):
        path = OUTPUT_DIR / filename
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'  Saved {path} ({len(data)} items)')

    print('\n--- Saving JSON files ---')
    save_json(brands, 'brands.json')
    save_json(categories, 'categories.json')
    save_json(products, 'products.json')
    save_json(product_images, 'product_images.json')
    save_json(attr_names, 'attribute_names.json')

    # Also extract all URL aliases for redirects later
    url_rows = parse_insert_values(content, 'oc_url_alias')
    url_aliases = []
    for row in url_rows:
        url_aliases.append({
            'query': str(row[1]),
            'keyword': str(row[2]),
        })
    save_json(url_aliases, 'url_aliases.json')

    print('\nDone!')


if __name__ == '__main__':
    main()
