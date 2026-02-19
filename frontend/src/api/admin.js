'use strict';

import client from './client';

export function getSettings() {
  return client.get('/api/admin/settings');
}

export function updateSetting(key, value) {
  return client.patch('/api/admin/settings', { key, value });
}
