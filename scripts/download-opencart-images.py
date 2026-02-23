#!/usr/bin/env python3
"""
Download non-JUKI product images and brand logos from sewtech.kz FTP.

Downloads:
  - Product main images (~254 files)
  - Additional product images (~347 files)
  - Brand logos (~42 files)

All files are saved to data/opencart/images/ preserving the original path structure.

Usage:
    python3 scripts/download-opencart-images.py
"""

import ftplib
import json
import os
import sys
from pathlib import Path

FTP_HOST = 'sewtech.kz'
FTP_USER = 'erlan'
FTP_PASS = 'J@93kaS4!NP3'
FTP_IMAGE_ROOT = '/image'

DATA_DIR = Path(__file__).parent.parent / 'data' / 'opencart'
IMAGES_DIR = DATA_DIR / 'images'


def download_file(ftp: ftplib.FTP, remote_path: str, local_path: Path) -> bool:
    """Download a single file from FTP. Returns True if successful."""
    if local_path.exists() and local_path.stat().st_size > 0:
        return True  # Already downloaded

    local_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        with open(local_path, 'wb') as f:
            ftp.retrbinary(f'RETR {remote_path}', f.write)
        return True
    except ftplib.error_perm as e:
        # File not found on server
        if local_path.exists():
            local_path.unlink()
        return False
    except Exception as e:
        if local_path.exists():
            local_path.unlink()
        return False


def main():
    # Collect all unique image paths to download
    products = json.load(open(DATA_DIR / 'products.json', encoding='utf-8'))
    brands = json.load(open(DATA_DIR / 'brands.json', encoding='utf-8'))

    image_paths = set()

    # Product main images
    for p in products:
        if p['image']:
            image_paths.add(p['image'])

    # Additional images
    for p in products:
        for img in p.get('additional_images', []):
            if img:
                image_paths.add(img)

    # Brand logos
    for b in brands:
        if b['logo_path']:
            image_paths.add(b['logo_path'])

    print(f'Total unique images to download: {len(image_paths)}')
    already = sum(1 for p in image_paths if (IMAGES_DIR / p).exists())
    print(f'Already downloaded: {already}')
    print(f'Need to download: {len(image_paths) - already}\n')

    if already == len(image_paths):
        print('All images already downloaded. Nothing to do.')
        return

    # Connect to FTP
    print(f'Connecting to {FTP_HOST}...')
    ftp = ftplib.FTP(FTP_HOST, timeout=30)
    ftp.login(FTP_USER, FTP_PASS)
    ftp.encoding = 'utf-8'
    print(f'Connected: {ftp.getwelcome()}\n')

    downloaded = 0
    failed = 0
    skipped = 0

    sorted_paths = sorted(image_paths)
    total = len(sorted_paths)

    for i, img_path in enumerate(sorted_paths):
        local_path = IMAGES_DIR / img_path

        if local_path.exists() and local_path.stat().st_size > 0:
            skipped += 1
            continue

        remote_path = f'{FTP_IMAGE_ROOT}/{img_path}'
        success = download_file(ftp, remote_path, local_path)

        if success:
            downloaded += 1
        else:
            failed += 1

        if (i + 1) % 50 == 0:
            print(f'  [{i + 1}/{total}] Downloaded: {downloaded}, Failed: {failed}, Skipped: {skipped}')

    ftp.quit()

    print(f'\n--- Download Complete ---')
    print(f'Downloaded: {downloaded}')
    print(f'Skipped (already existed): {skipped}')
    print(f'Failed: {failed}')

    # Verify
    total_size = 0
    total_files = 0
    for root, dirs, files in os.walk(IMAGES_DIR):
        for f in files:
            fp = Path(root) / f
            total_size += fp.stat().st_size
            total_files += 1

    print(f'\nTotal in {IMAGES_DIR}: {total_files} files, {total_size / 1024 / 1024:.1f} MB')


if __name__ == '__main__':
    main()
